const Squad = require("../models/Squad.js");
const User = require("../models/User.js");

//obtener todos los squads públicos filtrados por región
async function getSquads(req, res) {
  try {
    const search = req.query.search || "";
    const region = req.query.region || null;

    //construir query base
    const query = {
      isPublic: true,
    };

    //agregar búsqueda por nombre si existe
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    //obtener todos los squads públicos (filtrar por región después de populate)
    let squads = await Squad.find(query)
      .populate({
        path: "members.userId",
        select: "userName avatar lolProfile",
      })
      .populate({
        path: "createdBy",
        select: "userName avatar",
      })
      .sort({ createdAt: -1 }) //ordenar por fecha de creación descendente (más recientes primero)
      .lean();

    //filtrar por región si se proporciona
    //un squad pertenece a una región si todos sus miembros tienen esa región
    if (region) {
      squads = squads.filter((squad) => {
        //verificar que todos los miembros tengan la misma región
        if (!squad.members || squad.members.length === 0) return false;

        //obtener la región del primer miembro como referencia
        const firstMemberRegion = squad.members[0]?.userId?.lolProfile?.region;
        if (!firstMemberRegion) return false;

        //verificar que todos los miembros tengan la misma región y que coincida con la del usuario
        const allSameRegion = squad.members.every(
          (member) =>
            member.userId?.lolProfile?.region === firstMemberRegion &&
            member.userId?.lolProfile?.region === region
        );

        return allSameRegion;
      });
    }

    const formatted = squads.map((squad) => ({
      id: String(squad._id),
      name: squad.name,
      description: squad.description || "",
      members: squad.members.map((member) => ({
        userId: String(member.userId._id),
        userName: member.userId.userName,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      membersCount: squad.members.length,
      createdBy: {
        id: String(squad.createdBy._id),
        userName: squad.createdBy.userName,
        avatar: squad.createdBy.avatar,
      },
      isPublic: squad.isPublic,
      createdAt: squad.createdAt,
      updatedAt: squad.updatedAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error in getSquads:", error);
    res.status(500).json({ error: "Error al obtener los squads" });
  }
}

//obtener un squad por ID
async function getSquadById(req, res) {
  try {
    const { id } = req.params;
    const squad = await Squad.findById(id)
      .populate({
        path: "members.userId",
        select: "userName avatar lolProfile",
      })
      .populate({
        path: "createdBy",
        select: "userName avatar",
      })
      .lean();

    if (!squad) {
      return res.status(404).json({ error: "Squad no encontrado" });
    }

    //verificar si el usuario actual es miembro o si el squad es público
    const currentUserId = req.user?._id?.toString();
    const isMember = currentUserId
      ? squad.members.some((member) => String(member.userId._id) === currentUserId)
      : false;

    //si el squad es privado y el usuario no es miembro, denegar acceso
    if (!squad.isPublic && !isMember) {
      return res.status(403).json({ error: "No tienes acceso a este squad" });
    }

    const formatted = {
      id: String(squad._id),
      name: squad.name,
      description: squad.description || "",
      members: squad.members.map((member) => ({
        userId: {
          _id: String(member.userId._id),
          userName: member.userId.userName,
          avatar: member.userId.avatar,
          lolProfile: member.userId.lolProfile || {},
        },
        userName: member.userId.userName,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      membersCount: squad.members.length,
      createdBy: {
        id: String(squad.createdBy._id),
        userName: squad.createdBy.userName,
        avatar: squad.createdBy.avatar,
      },
      isPublic: squad.isPublic,
      createdAt: squad.createdAt,
      updatedAt: squad.updatedAt,
    };

    res.json(formatted);
  } catch (error) {
    console.error("Error in getSquadById:", error);
    res.status(500).json({ error: "Error al obtener el squad" });
  }
}

//crear un nuevo squad
async function createSquad(req, res) {
  try {
    const currentUserId = req.user._id;
    const { name, description, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "El nombre del squad es requerido" });
    }

    if (!role || !["Top", "Jungle", "Mid", "ADC", "Support"].includes(role)) {
      return res.status(400).json({ error: "El rol es requerido y debe ser válido" });
    }

    //verificar que el usuario no esté ya en otro squad
    const existingSquad = await Squad.findOne({
      "members.userId": currentUserId,
    });

    if (existingSquad) {
      return res.status(400).json({ error: "Ya estás en un squad" });
    }

    const trimmedName = name.trim();

    //verificar que el nombre sea único
    const existingSquadName = await Squad.findOne({
      name: trimmedName,
    });

    if (existingSquadName) {
      return res.status(400).json({ error: "Squad name already in use" });
    }

    const newSquad = new Squad({
      name: trimmedName,
      description: description?.trim() || "",
      members: [
        {
          userId: currentUserId,
          role: role,
        },
      ],
      createdBy: currentUserId,
      isPublic: true,
    });

    await newSquad.save();

    //sincronizar mySquad del creador (aunque solo haya 1 miembro, se sincroniza para mantener consistencia)
    await syncUserSquads(currentUserId);

    const populatedSquad = await Squad.findById(newSquad._id)
      .populate({
        path: "members.userId",
        select: "userName avatar lolProfile.roleLol lolProfile.ranks lolProfile.tier",
      })
      .populate({
        path: "createdBy",
        select: "userName avatar",
      })
      .lean();

    const formatted = {
      id: String(populatedSquad._id),
      name: populatedSquad.name,
      description: populatedSquad.description || "",
      members: populatedSquad.members.map((member) => ({
        userId: String(member.userId._id),
        userName: member.userId.userName,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      membersCount: populatedSquad.members.length,
      createdBy: {
        id: String(populatedSquad.createdBy._id),
        userName: populatedSquad.createdBy.userName,
        avatar: populatedSquad.createdBy.avatar,
      },
      isPublic: populatedSquad.isPublic,
      createdAt: populatedSquad.createdAt,
      updatedAt: populatedSquad.updatedAt,
    };

    res.status(201).json(formatted);
  } catch (error) {
    console.error("Error in createSquad:", error);
    if (error.message.includes("más de 5 miembros")) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes("rol único")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Error al crear el squad" });
  }
}

//actualizar nombre o descripción del squad (solo miembros)
async function updateSquad(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;
    const { name, description } = req.body;

    const squad = await Squad.findById(id);
    if (!squad) {
      return res.status(404).json({ error: "Squad no encontrado" });
    }

    //verificar que el usuario sea miembro del squad
    const isMember = squad.members.some(
      (member) => String(member.userId) === String(currentUserId)
    );

    if (!isMember) {
      return res.status(403).json({ error: "Solo los miembros pueden editar el squad" });
    }

    //actualizar campos si se proporcionan
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "El nombre no puede estar vacío" });
      }

      const trimmedName = name.trim();

      //verificar que el nombre sea único (excepto el squad actual)
      const existingSquad = await Squad.findOne({
        name: trimmedName,
        _id: { $ne: id },
      });

      if (existingSquad) {
        return res.status(400).json({ error: "Squad name already in use" });
      }

      squad.name = trimmedName;
    }

    if (description !== undefined) {
      squad.description = description?.trim() || "";
    }

    await squad.save();

    const populatedSquad = await Squad.findById(squad._id)
      .populate({
        path: "members.userId",
        select: "userName avatar lolProfile.roleLol lolProfile.ranks lolProfile.tier",
      })
      .populate({
        path: "createdBy",
        select: "userName avatar",
      })
      .lean();

    const formatted = {
      id: String(populatedSquad._id),
      name: populatedSquad.name,
      description: populatedSquad.description || "",
      members: populatedSquad.members.map((member) => ({
        userId: String(member.userId._id),
        userName: member.userId.userName,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      membersCount: populatedSquad.members.length,
      createdBy: {
        id: String(populatedSquad.createdBy._id),
        userName: populatedSquad.createdBy.userName,
        avatar: populatedSquad.createdBy.avatar,
      },
      isPublic: populatedSquad.isPublic,
      createdAt: populatedSquad.createdAt,
      updatedAt: populatedSquad.updatedAt,
    };

    //emitir actualización en tiempo real a todos los miembros del squad y a la sala del squad
    const { io } = require("../server.js");
    if (io) {
      const squadUpdateData = {
        squadId: formatted.id,
        name: formatted.name,
        description: formatted.description,
        members: formatted.members,
        membersCount: formatted.membersCount,
      };

      //emitir a todos los miembros del squad individualmente
      formatted.members.forEach((member) => {
        io.to(`user_${member.userId}`).emit("squad:updated_info", squadUpdateData);
      });

      //emitir a la sala del squad para que todos los usuarios que estén viendo este squad reciban la actualización
      io.to(`squad_${formatted.id}`).emit("squad:updated_info", squadUpdateData);
    }

    res.json(formatted);
  } catch (error) {
    console.error("Error in updateSquad:", error);
    res.status(500).json({ error: "Error al actualizar el squad" });
  }
}

//obtener el squad del usuario actual
async function getUserSquad(req, res) {
  try {
    const currentUserId = req.user._id;
    const userRegion = req.user.lolProfile?.region;

    if (!userRegion) {
      return res.json(null);
    }

    //buscar el squad donde el usuario es miembro
    const squad = await Squad.findOne({
      "members.userId": currentUserId,
      isPublic: true,
    })
      .populate({
        path: "members.userId",
        select: "userName avatar lolProfile",
      })
      .populate({
        path: "createdBy",
        select: "userName avatar",
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!squad) {
      return res.json(null);
    }

    //verificar que todos los miembros tengan la misma región
    const allSameRegion = squad.members.every(
      (member) => member.userId?.lolProfile?.region === userRegion
    );

    if (!allSameRegion) {
      return res.json(null);
    }

    //verificar que tenga al menos 2 miembros
    if (squad.members.length < 2) {
      return res.json(null);
    }

    const formatted = {
      id: String(squad._id),
      name: squad.name,
      description: squad.description || "",
      members: squad.members.map((member) => ({
        userId: {
          _id: String(member.userId._id),
          userName: member.userId.userName,
          avatar: member.userId.avatar,
          lolProfile: member.userId.lolProfile || {},
        },
        userName: member.userId.userName,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      membersCount: squad.members.length,
      createdBy: {
        id: String(squad.createdBy._id),
        userName: squad.createdBy.userName,
        avatar: squad.createdBy.avatar,
      },
      isPublic: squad.isPublic,
      createdAt: squad.createdAt,
      updatedAt: squad.updatedAt,
    };

    res.json(formatted);
  } catch (error) {
    console.error("Error in getUserSquad:", error);
    res.status(500).json({ error: "Error al obtener el squad del usuario" });
  }
}

//unirse a un squad
async function joinSquad(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;
    const { role } = req.body;

    if (!role || !["Top", "Jungle", "Mid", "ADC", "Support"].includes(role)) {
      return res.status(400).json({ error: "El rol es requerido y debe ser válido" });
    }

    const squad = await Squad.findById(id);
    if (!squad) {
      return res.status(404).json({ error: "Squad no encontrado" });
    }

    //verificar que el usuario no esté ya en otro squad
    const existingSquad = await Squad.findOne({
      "members.userId": currentUserId,
    });

    if (existingSquad && String(existingSquad._id) !== String(id)) {
      return res.status(400).json({ error: "Ya estás en otro squad" });
    }

    //verificar que el usuario no esté ya en este squad
    const isAlreadyMember = squad.members.some(
      (member) => String(member.userId) === String(currentUserId)
    );

    if (isAlreadyMember) {
      return res.status(400).json({ error: "Ya eres miembro de este squad" });
    }

    //verificar que no haya más de 5 miembros
    if (squad.members.length >= 5) {
      return res.status(400).json({ error: "El squad ya tiene 5 miembros" });
    }

    //verificar que el rol no esté ocupado
    const roleTaken = squad.members.some((member) => member.role === role);
    if (roleTaken) {
      return res.status(400).json({ error: "Este rol ya está ocupado" });
    }

    //agregar el usuario al squad
    squad.members.push({
      userId: currentUserId,
      role: role,
    });

    await squad.save();

    //sincronizar mySquad de TODOS los miembros del squad (incluyendo el nuevo)
    await syncAllSquadMembers(squad._id);

    //obtener el usuario que se unió
    const joiningUser = await User.findById(currentUserId).select("userName avatar");

    //crear notificaciones para todos los miembros del squad (excepto el que se unió)
    const { emitSquadNotification } = require("../sockets/notificationSocket.js");
    const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");

    //obtener los miembros del squad antes de populate para crear notificaciones
    const squadBeforePopulate = await Squad.findById(squad._id).lean();
    const otherMembers = squadBeforePopulate.members.filter(
      (member) => String(member.userId) !== String(currentUserId)
    );

    for (const member of otherMembers) {
      const memberUser = await User.findById(member.userId);
      if (memberUser) {
        if (!memberUser.squadNotifications) {
          memberUser.squadNotifications = [];
        }

        memberUser.squadNotifications.push({
          fromUserId: currentUserId,
          type: "squad_joined",
          status: "read",
          createdAt: getCurrentDateInTimezone(memberUser.preferences?.timezone || "Europe/Madrid"),
        });

        await memberUser.save();

        //emitir notificación en tiempo real
        const notificationData = {
          _id: memberUser.squadNotifications[memberUser.squadNotifications.length - 1]._id,
          fromUserId: {
            _id: joiningUser._id,
            userName: joiningUser.userName,
            avatar: joiningUser.avatar,
          },
          type: "squad_joined",
          status: "read",
          createdAt: memberUser.squadNotifications[memberUser.squadNotifications.length - 1].createdAt,
        };
        emitSquadNotification(memberUser._id.toString(), notificationData);
      }
    }

    //emitir notificación por broadcast a la sala del squad para que todos los miembros la reciban
    if (io) {
      const broadcastNotificationData = {
        fromUserId: {
          _id: joiningUser._id,
          userName: joiningUser.userName,
          avatar: joiningUser.avatar,
        },
        type: "squad_joined",
        status: "read",
        squadId: String(squad._id),
      };
      io.to(`squad_${squad._id}`).emit("squad:new_notification", broadcastNotificationData);
    }

    const populatedSquad = await Squad.findById(squad._id)
      .populate({
        path: "members.userId",
        select: "userName avatar lolProfile.roleLol lolProfile.ranks lolProfile.tier",
      })
      .populate({
        path: "createdBy",
        select: "userName avatar",
      })
      .lean();

    const formatted = {
      id: String(populatedSquad._id),
      name: populatedSquad.name,
      description: populatedSquad.description || "",
      members: populatedSquad.members.map((member) => ({
        userId: String(member.userId._id),
        userName: member.userId.userName,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      membersCount: populatedSquad.members.length,
      createdBy: {
        id: String(populatedSquad.createdBy._id),
        userName: populatedSquad.createdBy.userName,
        avatar: populatedSquad.createdBy.avatar,
      },
      isPublic: populatedSquad.isPublic,
      createdAt: populatedSquad.createdAt,
      updatedAt: populatedSquad.updatedAt,
    };

    //emitir actualización en tiempo real a TODOS los miembros del squad
    const { io } = require("../server.js");
    if (io) {
      const squadUpdateData = {
        squadId: formatted.id,
        name: formatted.name,
        description: formatted.description,
        members: formatted.members,
        membersCount: formatted.membersCount,
      };

      //emitir a todos los miembros del squad individualmente
      formatted.members.forEach((member) => {
        io.to(`user_${member.userId}`).emit("squad:updated", {
          squadId: formatted.id,
          members: formatted.members.map((m) => ({
            userId: m.userId,
            userName: m.userName,
            avatar: m.avatar,
            role: m.role,
          })),
        });
        io.to(`user_${member.userId}`).emit("squad:updated_info", squadUpdateData);
      });

      //emitir a la sala del squad
      io.to(`squad_${formatted.id}`).emit("squad:updated", {
        squadId: formatted.id,
        members: formatted.members.map((m) => ({
          userId: m.userId,
          userName: m.userName,
          avatar: m.avatar,
          role: m.role,
        })),
      });
      io.to(`squad_${formatted.id}`).emit("squad:updated_info", squadUpdateData);
    }

    res.json(formatted);
  } catch (error) {
    console.error("Error in joinSquad:", error);
    res.status(500).json({ error: "Error al unirse al squad" });
  }
}

//función auxiliar para sincronizar mySquad del usuario con la colección Squad
//esta función actualiza el mySquad del usuario basándose en el squad de la colección
async function syncUserSquads(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const userRegion = user.lolProfile?.region;
    if (!userRegion) {
      //si no tiene región, vaciar mySquad
      user.lolProfile.mySquad = [];
      await user.save();
      return;
    }

    //buscar el squad donde el usuario es miembro
    const squad = await Squad.findOne({
      "members.userId": userId,
    })
      .populate({
        path: "members.userId",
        select: "lolProfile.region",
      })
      .lean();

    //si no hay squad o tiene menos de 2 miembros, vaciar mySquad
    if (!squad || squad.members.length < 2) {
      user.lolProfile.mySquad = [];
      await user.save();
      return;
    }

    //verificar que todos los miembros tengan la misma región
    const allSameRegion = squad.members.every(
      (member) => member.userId?.lolProfile?.region === userRegion
    );

    if (!allSameRegion) {
      //si no todos tienen la misma región, vaciar mySquad
      user.lolProfile.mySquad = [];
      await user.save();
      return;
    }

    //construir mySquad con los otros miembros del squad (excluyendo al usuario actual)
    const mySquad = squad.members
      .filter((member) => String(member.userId._id) !== String(userId))
      .map((member) => ({
        userId: member.userId._id,
        role: member.role,
        addedAt: member.joinedAt || new Date(),
      }));

    user.lolProfile.mySquad = mySquad;
    await user.save();
  } catch (error) {
    console.error("Error syncing user squads:", error);
  }
}

//función auxiliar para sincronizar mySquad de TODOS los miembros de un squad
async function syncAllSquadMembers(squadId) {
  try {
    const squad = await Squad.findById(squadId)
      .populate({
        path: "members.userId",
        select: "lolProfile.region",
      })
      .lean();

    if (!squad) return;

    //sincronizar mySquad de todos los miembros del squad
    for (const member of squad.members) {
      await syncUserSquads(member.userId._id);
    }
  } catch (error) {
    console.error("Error syncing all squad members:", error);
  }
}

//salir de un squad
async function leaveSquad(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;
    const User = require("../models/User.js");
    const { emitSquadNotification } = require("../sockets/notificationSocket.js");
    const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");
    const { io } = require("../server.js");

    const squad = await Squad.findById(id)
      .populate({
        path: "members.userId",
        select: "userName avatar email",
      })
      .lean();

    if (!squad) {
      return res.status(404).json({ error: "Squad no encontrado" });
    }

    //verificar que el usuario sea miembro del squad
    const memberIndex = squad.members.findIndex(
      (member) => String(member.userId._id) === String(currentUserId)
    );

    if (memberIndex === -1) {
      return res.status(403).json({ error: "No eres miembro de este squad" });
    }

    const leavingUser = squad.members[memberIndex].userId;
    const remainingMembers = squad.members.filter(
      (member) => String(member.userId._id) !== String(currentUserId)
    );

    //si solo quedan 2 usuarios y uno se va, eliminar el squad completo
    const willDeleteSquad = squad.members.length === 2;

    if (willDeleteSquad) {
      //crear notificaciones para el otro miembro indicando que el squad fue eliminado
      const otherMember = remainingMembers[0];
      const otherUser = await User.findById(otherMember.userId._id);

      if (otherUser) {
        if (!otherUser.squadNotifications) {
          otherUser.squadNotifications = [];
        }

        otherUser.squadNotifications.push({
          fromUserId: currentUserId,
          type: "squad_deleted",
          status: "read",
          createdAt: getCurrentDateInTimezone(otherUser.preferences?.timezone || "Europe/Madrid"),
        });

        await otherUser.save();

        //emitir notificación en tiempo real
        const notificationData = {
          _id: otherUser.squadNotifications[otherUser.squadNotifications.length - 1]._id,
          fromUserId: {
            _id: leavingUser._id,
            userName: leavingUser.userName,
            avatar: leavingUser.avatar,
          },
          type: "squad_deleted",
          status: "read",
          createdAt: otherUser.squadNotifications[otherUser.squadNotifications.length - 1].createdAt,
        };
        emitSquadNotification(otherUser._id.toString(), notificationData);
      }

      //emitir notificación por broadcast a la sala del squad antes de eliminarlo
      if (io) {
        const broadcastNotificationData = {
          fromUserId: {
            _id: leavingUser._id,
            userName: leavingUser.userName,
            avatar: leavingUser.avatar,
          },
          type: "squad_deleted",
          status: "read",
          squadId: String(id),
        };
        io.to(`squad_${id}`).emit("squad:new_notification", broadcastNotificationData);
      }

      //eliminar el squad
      await Squad.findByIdAndDelete(id);

      //vaciar mySquad de ambos usuarios (ya que el squad fue eliminado)
      await syncUserSquads(currentUserId);
      await syncUserSquads(otherMember.userId._id);

      //emitir evento de eliminación del squad
      if (io) {
        io.to(`user_${currentUserId}`).emit("squad:deleted", { squadId: id });
        io.to(`user_${otherMember.userId._id}`).emit("squad:deleted", { squadId: id });
        io.to(`squad_${id}`).emit("squad:deleted", { squadId: id });
      }

      return res.json({
        message: "Squad eliminado correctamente",
        deleted: true
      });
    }

    //si no se elimina el squad, remover el miembro
    const squadDoc = await Squad.findById(id);
    squadDoc.members = squadDoc.members.filter(
      (member) => String(member.userId) !== String(currentUserId)
    );

    //si el creador se va, asignar el creador al primer miembro restante
    if (String(squadDoc.createdBy) === String(currentUserId)) {
      squadDoc.createdBy = squadDoc.members[0].userId;
    }

    await squadDoc.save();

    //crear notificaciones para los otros miembros indicando que el usuario se ha salido
    for (const member of remainingMembers) {
      const memberUser = await User.findById(member.userId._id);

      if (memberUser) {
        if (!memberUser.squadNotifications) {
          memberUser.squadNotifications = [];
        }

        memberUser.squadNotifications.push({
          fromUserId: currentUserId,
          type: "squad_left",
          status: "read",
          createdAt: getCurrentDateInTimezone(memberUser.preferences?.timezone || "Europe/Madrid"),
        });

        await memberUser.save();

        //emitir notificación en tiempo real
        const notificationData = {
          _id: memberUser.squadNotifications[memberUser.squadNotifications.length - 1]._id,
          fromUserId: {
            _id: leavingUser._id,
            userName: leavingUser.userName,
            avatar: leavingUser.avatar,
          },
          type: "squad_left",
          status: "read",
          createdAt: memberUser.squadNotifications[memberUser.squadNotifications.length - 1].createdAt,
        };
        emitSquadNotification(memberUser._id.toString(), notificationData);
      }
    }

    //emitir notificación por broadcast a la sala del squad para que todos los miembros la reciban
    if (io) {
      const broadcastNotificationData = {
        fromUserId: {
          _id: leavingUser._id,
          userName: leavingUser.userName,
          avatar: leavingUser.avatar,
        },
        type: "squad_left",
        status: "read",
        squadId: String(id),
      };
      io.to(`squad_${id}`).emit("squad:new_notification", broadcastNotificationData);
    }

    //sincronizar mySquad de todos los miembros restantes del squad
    //el usuario que sale ya no está en el squad, así que su mySquad se vaciará
    await syncUserSquads(currentUserId);
    //los miembros restantes deben actualizar su mySquad con los otros miembros
    await syncAllSquadMembers(id);

    //emitir evento de actualización del squad
    if (io) {
      const updatedSquad = await Squad.findById(id)
        .populate({
          path: "members.userId",
          select: "userName avatar lolProfile",
        })
        .lean();

      const squadUpdateData = {
        squadId: String(updatedSquad._id),
        name: updatedSquad.name,
        description: updatedSquad.description,
        members: updatedSquad.members.map((member) => ({
          userId: String(member.userId._id),
          userName: member.userId.userName,
          avatar: member.userId.avatar,
          role: member.role,
        })),
        membersCount: updatedSquad.members.length,
      };

      //emitir a todos los miembros restantes
      updatedSquad.members.forEach((member) => {
        io.to(`user_${member.userId._id}`).emit("squad:updated", {
          squadId: String(updatedSquad._id),
          members: squadUpdateData.members,
        });
        io.to(`user_${member.userId._id}`).emit("squad:updated_info", squadUpdateData);
      });
      io.to(`user_${currentUserId}`).emit("squad:left", { squadId: id });
      io.to(`squad_${id}`).emit("squad:updated", {
        squadId: String(updatedSquad._id),
        members: squadUpdateData.members,
      });
      io.to(`squad_${id}`).emit("squad:updated_info", squadUpdateData);
    }

    res.json({
      message: "Has salido del squad correctamente",
      deleted: false
    });
  } catch (error) {
    console.error("Error in leaveSquad:", error);
    res.status(500).json({ error: "Error al salir del squad" });
  }
}

module.exports = {
  getSquads,
  getSquadById,
  createSquad,
  updateSquad,
  joinSquad,
  leaveSquad,
  getUserSquad,
  syncUserSquads,
  syncAllSquadMembers,
};

