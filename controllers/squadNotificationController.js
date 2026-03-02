const mongoose = require("mongoose");
const User = require("../models/User.js");
const Squad = require("../models/Squad.js");
const userDTO = require("../dtos/userDTO.js");
const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");
const { emitSquadNotification, emitSquadAccepted, emitSquadRejected } = require("../sockets/notificationSocket.js");

//enviar solicitud de squad a otro usuario
const sendSquadInvitation = async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.user._id;
    const currentUserRegion = req.user.lolProfile?.region;
    const currentUserRole = req.user.lolProfile?.roleLol;
    const userTimezone = req.user.preferences?.timezone || "Europe/Madrid";

    try {
        //validar que se proporcione el userId
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

        //validar que no sea el mismo usuario
        if (userId === currentUserId.toString() || userId.toString() === currentUserId.toString()) {
            return res.status(400).json({ message: "You cannot invite yourself" });
        }

        //convertir userId a ObjectId
        let userIdObjectId;
        try {
            userIdObjectId = new mongoose.Types.ObjectId(userId);
        } catch (err) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        //buscar usuario objetivo
        const targetUser = await User.findById(userIdObjectId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        //validar misma región
        if (targetUser.lolProfile?.region !== currentUserRegion) {
            return res.status(400).json({ message: "Users must be in the same region" });
        }

        //validar que el usuario actual tenga un rol
        if (!currentUserRole) {
            return res.status(400).json({ message: "You must have a role configured" });
        }

        //validar que el rol del usuario actual no esté ocupado en el squad del objetivo
        const targetUserSquad = targetUser.lolProfile?.mySquad || [];
        const roleExists = targetUserSquad.some(
            (member) => member.role === currentUserRole
        );
        if (roleExists) {
            return res.status(400).json({
                message: `The role ${currentUserRole} is already occupied in the squad of this user`
            });
        }

        //validar que el rol del objetivo no esté ocupado en el squad del usuario actual
        const currentUserSquad = req.user.lolProfile?.mySquad || [];
        const targetRole = targetUser.lolProfile?.roleLol;
        if (targetRole) {
            const targetRoleExists = currentUserSquad.some(
                (member) => member.role === targetRole
            );
            if (targetRoleExists) {
                return res.status(400).json({
                    message: `You already have a ${targetRole} in your squad`
                });
            }
        }

        //verificar si ya existe una notificación pendiente
        const existingNotification = targetUser.squadNotifications?.find(
            (notif) =>
                notif.fromUserId.toString() === currentUserId.toString() &&
                notif.type === "squad_invitation" &&
                notif.status === "pending"
        );

        if (existingNotification) {
            return res.status(400).json({ message: "Already have a pending squad invitation" });
        }

        //agregar notificación al usuario objetivo
        if (!targetUser.squadNotifications) {
            targetUser.squadNotifications = [];
        }

        targetUser.squadNotifications.push({
            fromUserId: currentUserId,
            type: "squad_invitation",
            status: "pending",
            createdAt: getCurrentDateInTimezone(targetUser.preferences?.timezone || "Europe/Madrid"),
        });

        await targetUser.save();

        //obtener datos del usuario que envía para la respuesta
        const fromUserData = await User.findById(currentUserId)
            .select("userName avatar lolProfile.roleLol");

        //emitir notificación en tiempo real al usuario objetivo
        const notificationData = {
            _id: targetUser.squadNotifications[targetUser.squadNotifications.length - 1]._id,
            fromUserId: {
                _id: fromUserData._id,
                userName: fromUserData.userName,
                avatar: fromUserData.avatar,
                roleLol: fromUserData.lolProfile?.roleLol,
            },
            type: "squad_invitation",
            status: "pending",
            createdAt: targetUser.squadNotifications[targetUser.squadNotifications.length - 1].createdAt,
        };
        emitSquadNotification(targetUser._id.toString(), notificationData);

        //status 200: ok
        res.status(200).json({
            message: "Squad invitation sent successfully",
            notification: notificationData
        });
    } catch (err) {
        console.error("Error sending squad invitation:", err);
        //status 500: server error
        res.status(500).json({ message: "Error sending squad invitation ❌" });
    }
};

//aceptar solicitud de squad
const acceptSquadInvitation = async (req, res) => {
    const { notificationId } = req.body;
    const currentUserId = req.user._id;
    const currentUserTimezone = req.user.preferences?.timezone || "Europe/Madrid";

    try {
        //validar que se proporcione el notificationId
        if (!notificationId) {
            return res.status(400).json({ message: "Notification ID is required" });
        }

        //buscar notificación en el usuario actual
        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const notification = user.squadNotifications?.find(
            (notif) => notif._id.toString() === notificationId
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        if (notification.status !== "pending") {
            return res.status(400).json({ message: "This request has already been processed" });
        }

        //buscar usuario que envió la solicitud
        const fromUser = await User.findById(notification.fromUserId);
        if (!fromUser) {
            return res.status(404).json({ message: "User who sent the request not found" });
        }

        //validar que los usuarios aún tengan la misma región
        if (fromUser.lolProfile?.region !== user.lolProfile?.region) {
            notification.status = "rejected";
            notification.readAt = getCurrentDateInTimezone(currentUserTimezone);
            await user.save();
            return res.status(400).json({ message: "The users are no longer in the same region" });
        }

        //obtener roles de los usuarios
        const fromUserRole = fromUser.lolProfile?.roleLol;
        const currentUserRole = user.lolProfile?.roleLol;

        if (!fromUserRole || !currentUserRole) {
            return res.status(400).json({ message: "Both users must have a role configured" });
        }

        //verificar si alguno de los usuarios ya está en un squad
        const existingSquad = await Squad.findOne({
            $or: [
                { "members.userId": currentUserId },
                { "members.userId": fromUser._id },
            ],
        })
            .populate({
                path: "members.userId",
                select: "lolProfile.region",
            })
            .lean();

        if (existingSquad) {
            //verificar que ambos usuarios estén en el mismo squad
            const currentUserInSquad = existingSquad.members.some(
                (m) => String(m.userId._id) === String(currentUserId)
            );
            const fromUserInSquad = existingSquad.members.some(
                (m) => String(m.userId._id) === String(fromUser._id)
            );

            //si ambos ya están en el mismo squad, no hacer nada
            if (currentUserInSquad && fromUserInSquad) {
                return res.status(400).json({
                    message: "Both users are already in the same squad",
                });
            }

            //verificar que no haya más de 5 miembros
            if (existingSquad.members.length >= 5) {
                return res.status(400).json({
                    message: "The squad already has 5 members. Cannot add more users.",
                });
            }

            //verificar que los roles no estén ocupados en el squad existente
            const fromUserRoleTaken = existingSquad.members.some((m) => m.role === fromUserRole);
            const currentUserRoleTaken = existingSquad.members.some((m) => m.role === currentUserRole);

            if (currentUserInSquad && fromUserRoleTaken) {
                return res.status(400).json({
                    message: `Cannot add user: The squad already has a ${fromUserRole}`,
                    code: "ROLE_ALREADY_EXISTS",
                });
            }

            if (fromUserInSquad && currentUserRoleTaken) {
                return res.status(400).json({
                    message: `Cannot add user: The squad already has a ${currentUserRole}`,
                    code: "ROLE_ALREADY_EXISTS",
                });
            }
        }

        //agregar ambos usuarios a los squads de cada uno
        if (!user.lolProfile.mySquad) {
            user.lolProfile.mySquad = [];
        }
        if (!fromUser.lolProfile.mySquad) {
            fromUser.lolProfile.mySquad = [];
        }

        //no modificar mySquad manualmente aquí, se sincronizará después de crear/actualizar el squad en la colección Squad

        //obtener timezone del usuario que envió la solicitud
        const fromUserTimezone = fromUser.preferences?.timezone || "Europe/Madrid";

        //eliminar la notificación original de la invitación del usuario actual (que aceptó)
        user.squadNotifications = user.squadNotifications.filter(
            (notif) => notif._id.toString() !== notificationId
        );

        //crear notificación de aceptación para el usuario que envió la solicitud
        if (!fromUser.squadNotifications) {
            fromUser.squadNotifications = [];
        }
        const acceptanceNotification = {
            fromUserId: currentUserId,
            type: "squad_accepted",
            status: "pending",
            createdAt: getCurrentDateInTimezone(fromUserTimezone),
        };
        fromUser.squadNotifications.push(acceptanceNotification);

        //guardar usuarios (sin modificar mySquad todavía)
        await user.save();
        await fromUser.save();

        //crear o actualizar squad en la colección Squad
        //buscar si alguno de los usuarios ya tiene un squad
        let squad = await Squad.findOne({
            $or: [
                { "members.userId": currentUserId },
                { "members.userId": fromUser._id },
            ],
        });

        if (!squad) {
            //crear nuevo squad con ambos usuarios
            squad = new Squad({
                name: `${fromUser.userName}'s Squad`,
                description: "",
                members: [
                    {
                        userId: fromUser._id,
                        role: fromUserRole,
                    },
                    {
                        userId: currentUserId,
                        role: currentUserRole,
                    },
                ],
                createdBy: fromUser._id,
                isPublic: true,
            });
            await squad.save();
        } else {
            //agregar el usuario que falta al squad existente
            const fromUserInSquad = squad.members.some(
                (m) => String(m.userId) === String(fromUser._id)
            );
            const currentUserInSquad = squad.members.some(
                (m) => String(m.userId) === String(currentUserId)
            );

            //verificar que no haya más de 5 miembros
            if (squad.members.length >= 5) {
                return res.status(400).json({
                    message: "El squad ya tiene 5 miembros. No se pueden agregar más usuarios."
                });
            }

            //verificar que los roles no estén ocupados
            const fromUserRoleTaken = squad.members.some((m) => m.role === fromUserRole);
            const currentUserRoleTaken = squad.members.some((m) => m.role === currentUserRole);

            if (!fromUserInSquad && !fromUserRoleTaken) {
                squad.members.push({
                    userId: fromUser._id,
                    role: fromUserRole,
                });
            }

            if (!currentUserInSquad && !currentUserRoleTaken) {
                squad.members.push({
                    userId: currentUserId,
                    role: currentUserRole,
                });
            }

            await squad.save();
        }

        //sincronizar mySquad de TODOS los miembros del squad
        const syncAllSquadMembers = require("./squadController.js").syncAllSquadMembers;
        if (squad) {
            await syncAllSquadMembers(squad._id);
        }

        //crear notificaciones para todos los miembros del squad cuando se agregan usuarios
        //obtener los miembros del squad antes de populate
        const squadBeforePopulate = await Squad.findById(squad._id).lean();
        const { emitSquadNotification } = require("../sockets/notificationSocket.js");

        //si se agregó el usuario actual al squad, notificar a los otros miembros
        const currentUserInSquad = squadBeforePopulate.members.some(
            (m) => String(m.userId) === String(currentUserId)
        );
        const fromUserInSquad = squadBeforePopulate.members.some(
            (m) => String(m.userId) === String(fromUser._id)
        );

        //si el usuario actual se agregó al squad, notificar a los otros miembros
        if (currentUserInSquad) {
            const currentUserData = await User.findById(currentUserId).select("userName avatar");
            const otherMembers = squadBeforePopulate.members.filter(
                (m) => String(m.userId) !== String(currentUserId)
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
                            _id: currentUserData._id,
                            userName: currentUserData.userName,
                            avatar: currentUserData.avatar,
                        },
                        type: "squad_joined",
                        status: "read",
                        createdAt: memberUser.squadNotifications[memberUser.squadNotifications.length - 1].createdAt,
                    };
                    emitSquadNotification(memberUser._id.toString(), notificationData);
                }
            }
        }

        //si el usuario que envió la invitación se agregó al squad, notificar a los otros miembros
        if (fromUserInSquad) {
            const fromUserData = await User.findById(fromUser._id).select("userName avatar");
            const otherMembers = squadBeforePopulate.members.filter(
                (m) => String(m.userId) !== String(fromUser._id)
            );

            for (const member of otherMembers) {
                const memberUser = await User.findById(member.userId);
                if (memberUser) {
                    if (!memberUser.squadNotifications) {
                        memberUser.squadNotifications = [];
                    }

                    memberUser.squadNotifications.push({
                        fromUserId: fromUser._id,
                        type: "squad_joined",
                        status: "read",
                        createdAt: getCurrentDateInTimezone(memberUser.preferences?.timezone || "Europe/Madrid"),
                    });

                    await memberUser.save();

                    //emitir notificación en tiempo real
                    const notificationData = {
                        _id: memberUser.squadNotifications[memberUser.squadNotifications.length - 1]._id,
                        fromUserId: {
                            _id: fromUserData._id,
                            userName: fromUserData.userName,
                            avatar: fromUserData.avatar,
                        },
                        type: "squad_joined",
                        status: "read",
                        createdAt: memberUser.squadNotifications[memberUser.squadNotifications.length - 1].createdAt,
                    };
                    emitSquadNotification(memberUser._id.toString(), notificationData);
                }
            }
        }

        //re-populate para obtener datos completos
        await user.populate({
            path: "lolProfile.mySquad.userId",
            select: "userName avatar lolProfile.roleLol lolProfile.ranks lolProfile.tier",
        });

        //obtener datos del usuario para la notificación
        const fromUserData = await User.findById(currentUserId)
            .select("userName avatar lolProfile.roleLol");

        //preparar datos de la notificación con información completa
        const notificationData = {
            _id: fromUser.squadNotifications[fromUser.squadNotifications.length - 1]._id,
            fromUserId: {
                _id: fromUserData._id,
                userName: fromUserData.userName,
                avatar: fromUserData.avatar,
                roleLol: fromUserData.lolProfile?.roleLol,
            },
            type: "squad_accepted",
            status: "pending",
            createdAt: acceptanceNotification.createdAt,
        };

        //emitir notificación de aceptación al usuario que envió la solicitud
        emitSquadAccepted(fromUser._id.toString(), notificationData);

        //emitir actualización de squad a TODOS los miembros del squad en tiempo real
        const { io } = require("../server.js");
        if (io) {
            const squadData = await Squad.findById(squad._id)
                .populate({
                    path: "members.userId",
                    select: "userName avatar lolProfile",
                })
                .lean();

            const squadUpdateData = {
                squadId: squad._id.toString(),
                members: squadData.members.map((m) => ({
                    userId: String(m.userId._id),
                    userName: m.userId.userName,
                    avatar: m.userId.avatar,
                    role: m.role,
                })),
            };

            const squadInfoData = {
                squadId: squad._id.toString(),
                name: squadData.name || "",
                description: squadData.description || "",
                members: squadUpdateData.members,
                membersCount: squadUpdateData.members.length,
            };

            //emitir actualización de squad a TODOS los miembros del squad individualmente
            squadData.members.forEach((member) => {
                io.to(`user_${member.userId._id}`).emit("squad:updated", squadUpdateData);
                io.to(`user_${member.userId._id}`).emit("squad:updated_info", squadInfoData);
            });

            //emitir actualización de squad a la sala del squad para usuarios que estén viendo el squad
            io.to(`squad_${squad._id}`).emit("squad:updated", squadUpdateData);
            io.to(`squad_${squad._id}`).emit("squad:updated_info", squadInfoData);

            //emitir notificaciones de squad por broadcast a la sala del squad
            const squadBeforePopulate = await Squad.findById(squad._id).lean();
            const currentUserInSquad = squadBeforePopulate.members.some(
                (m) => String(m.userId) === String(currentUserId)
            );
            const fromUserInSquad = squadBeforePopulate.members.some(
                (m) => String(m.userId) === String(fromUser._id)
            );

            if (currentUserInSquad) {
                const currentUserData = await User.findById(currentUserId).select("userName avatar");
                const broadcastNotificationData = {
                    fromUserId: {
                        _id: currentUserData._id,
                        userName: currentUserData.userName,
                        avatar: currentUserData.avatar,
                    },
                    type: "squad_joined",
                    status: "read",
                    squadId: squad._id.toString(),
                };
                io.to(`squad_${squad._id}`).emit("squad:new_notification", broadcastNotificationData);
            }

            if (fromUserInSquad) {
                const fromUserData = await User.findById(fromUser._id).select("userName avatar");
                const broadcastNotificationData = {
                    fromUserId: {
                        _id: fromUserData._id,
                        userName: fromUserData.userName,
                        avatar: fromUserData.avatar,
                    },
                    type: "squad_joined",
                    status: "read",
                    squadId: squad._id.toString(),
                };
                io.to(`squad_${squad._id}`).emit("squad:new_notification", broadcastNotificationData);
            }
        }

        //status 200: ok
        res.status(200).json({
            message: "Squad invitation accepted successfully. Both users have been added to each other's squad",
            user: userDTO(user)
        });
    } catch (err) {
        console.error("Error accepting squad invitation:", err);
        //status 500: server error
        res.status(500).json({ message: "Error accepting request ❌" });
    }
};

//eliminar solicitud de squad
const rejectSquadInvitation = async (req, res) => {
    const { notificationId } = req.body;
    const currentUserId = req.user._id;
    const currentUserTimezone = req.user.preferences?.timezone || "Europe/Madrid";

    try {
        //validar que se proporcione el notificationId
        if (!notificationId) {
            return res.status(400).json({ message: "Notification ID is required" });
        }

        //buscar la notificación en el usuario actual
        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const notification = user.squadNotifications?.find(
            (notif) => notif._id.toString() === notificationId
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        if (notification.status !== "pending") {
            return res.status(400).json({ message: "This request has already been processed" });
        }

        //obtener el fromUserId antes de eliminar la notificación
        const fromUserId = notification.fromUserId;

        //eliminar la notificación del array
        user.squadNotifications = user.squadNotifications.filter(
            (notif) => notif._id.toString() !== notificationId
        );

        //notificar al usuario que envió la solicitud
        const fromUser = await User.findById(fromUserId);
        if (fromUser) {
            if (!fromUser.squadNotifications) {
                fromUser.squadNotifications = [];
            }
            const fromUserTimezone = fromUser.preferences?.timezone || "Europe/Madrid";
            fromUser.squadNotifications.push({
                fromUserId: currentUserId,
                type: "squad_rejected",
                status: "pending",
                createdAt: getCurrentDateInTimezone(fromUserTimezone),
            });
            await fromUser.save();

            //obtener datos del usuario que rechazó para la notificación
            const currentUserData = await User.findById(currentUserId)
                .select("userName avatar lolProfile.roleLol");

            //emitir notificación completa de rechazo al usuario que envió la solicitud
            const notificationData = {
                _id: fromUser.squadNotifications[fromUser.squadNotifications.length - 1]._id,
                fromUserId: {
                    _id: currentUserData._id,
                    userName: currentUserData.userName,
                    avatar: currentUserData.avatar,
                    roleLol: currentUserData.lolProfile?.roleLol,
                },
                type: "squad_rejected",
                status: "pending",
                createdAt: fromUser.squadNotifications[fromUser.squadNotifications.length - 1].createdAt,
            };
            emitSquadRejected(fromUser._id.toString(), notificationData);
        }

        await user.save();

        //status 200: ok
        res.status(200).json({
            message: "Request rejected",
            user: userDTO(user)
        });
    } catch (err) {
        console.error("Error rejecting squad invitation:", err);
        //status 500: server error
        res.status(500).json({ message: "Error rejecting request ❌" });
    }
};

//obtener notificaciones de squad
const getSquadNotifications = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('squadNotifications.fromUserId', 'userName avatar lolProfile.roleLol')
            .select('squadNotifications');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const notifications = user.squadNotifications || [];

        //ordenar notificaciones: pendientes primero, luego por fecha más reciente
        const sortedNotifications = notifications.sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1;
            if (a.status !== "pending" && b.status === "pending") return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        //status 200: ok
        res.status(200).json({ notifications: sortedNotifications });
    } catch (err) {
        console.error("Error getting notifications:", err);
        //status 500: server error
        res.status(500).json({ message: "Error getting notifications ❌" });
    }
};

//eliminar notificación de squad (usado para notificaciones de rechazo)
const deleteSquadNotification = async (req, res) => {
    const { notificationId } = req.body;
    const currentUserId = req.user._id;

    try {
        //validar que se proporcione el notificationId
        if (!notificationId) {
            return res.status(400).json({ message: "Notification ID is required" });
        }

        //buscar usuario actual
        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //validar que la notificación existe
        const notification = user.squadNotifications?.find(
            (notif) => notif._id.toString() === notificationId
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        //eliminar la notificación del usuario actual
        user.squadNotifications = user.squadNotifications.filter(
            (notif) => notif._id.toString() !== notificationId
        );

        await user.save();

        //si esta es una notificación de aceptación, también eliminar todas las notificaciones relacionadas de todos los miembros del squad
        //y agregar usuarios al squad en tiempo real
        if (notification.type === "squad_accepted" && notification.fromUserId) {
            const otherUserId = notification.fromUserId;
            const otherUser = await User.findById(otherUserId);

            //buscar el squad que contiene a los usuarios
            let squad = await Squad.findOne({
                $or: [
                    { "members.userId": currentUserId },
                    { "members.userId": otherUserId },
                ],
            })
                .populate({
                    path: "members.userId",
                    select: "_id",
                });

            //eliminar todas las notificaciones relacionadas de ambos usuarios
            if (otherUser && otherUser.squadNotifications) {
                //eliminar notificaciones de invitación aceptada del otro usuario
                otherUser.squadNotifications = otherUser.squadNotifications.filter(
                    (notif) => !(
                        notif.type === "squad_invitation" &&
                        notif.status === "accepted" &&
                        notif.fromUserId?.toString() === currentUserId.toString()
                    )
                );
                //eliminar notificaciones de aceptación del otro usuario
                otherUser.squadNotifications = otherUser.squadNotifications.filter(
                    (notif) => !(
                        notif.type === "squad_accepted" &&
                        notif.fromUserId?.toString() === currentUserId.toString()
                    )
                );
                //eliminar notificaciones de squad_joined del otro usuario relacionadas con el usuario actual
                otherUser.squadNotifications = otherUser.squadNotifications.filter(
                    (notif) => !(
                        (notif.type === "squad_joined" && notif.fromUserId?.toString() === currentUserId.toString()) ||
                        (notif.type === "squad_left" && notif.fromUserId?.toString() === currentUserId.toString())
                    )
                );
                await otherUser.save();
            }

            //eliminar notificaciones de aceptación, squad_joined y squad_left del usuario actual
            user.squadNotifications = user.squadNotifications.filter(
                (notif) => !(
                    (notif.type === "squad_accepted" && notif.fromUserId?.toString() === otherUserId.toString()) ||
                    (notif.type === "squad_joined" && notif.fromUserId?.toString() === otherUserId.toString()) ||
                    (notif.type === "squad_left" && notif.fromUserId?.toString() === otherUserId.toString())
                )
            );
            await user.save();

            //si existe un squad, eliminar todas las notificaciones relacionadas de todos los miembros
            if (squad && squad.members) {
                const squadMemberIds = squad.members.map((m) =>
                    String(m.userId?._id || m.userId)
                );

                for (const memberId of squadMemberIds) {
                    const memberUser = await User.findById(memberId);
                    if (memberUser && memberUser.squadNotifications) {
                        //eliminar todas las notificaciones relacionadas con los usuarios del squad
                        const originalLength = memberUser.squadNotifications.length;
                        memberUser.squadNotifications = memberUser.squadNotifications.filter(
                            (notif) => {
                                //mantener solo notificaciones que no estén relacionadas con los miembros del squad
                                const notifFromUserId = String(notif.fromUserId);
                                //eliminar todas las notificaciones squad_joined y squad_left de cualquier miembro del squad
                                if ((notif.type === "squad_joined" || notif.type === "squad_left") &&
                                    squadMemberIds.includes(notifFromUserId)) {
                                    return false;
                                }
                                //eliminar notificaciones de aceptación e invitación relacionadas con los usuarios involucrados
                                return !(
                                    (notif.type === "squad_accepted" ||
                                        notif.type === "squad_invitation") &&
                                    squadMemberIds.includes(notifFromUserId) &&
                                    (notifFromUserId === String(currentUserId) ||
                                        notifFromUserId === String(otherUserId))
                                );
                            }
                        );

                        //solo guardar si hubo cambios
                        if (memberUser.squadNotifications.length !== originalLength) {
                            await memberUser.save();

                            //emitir evento para actualizar notificaciones en tiempo real
                            const { io } = require("../server.js");
                            if (io) {
                                io.to(`user_${memberId}`).emit("squad:notifications_updated");
                            }
                        }
                    }
                }
            }

            //agregar usuarios al squad en la colección Squad cuando se elimina la última notificación de aceptación
            //si no se encontró el squad antes, buscarlo ahora
            if (!squad) {
                squad = await Squad.findOne({
                    $or: [
                        { "members.userId": currentUserId },
                        { "members.userId": otherUserId },
                    ],
                });
            }

            const currentUserRole = user.lolProfile?.roleLol;
            const otherUserRole = otherUser?.lolProfile?.roleLol;

            if (!squad && currentUserRole && otherUserRole) {
                //crear nuevo squad con ambos usuarios
                squad = new Squad({
                    name: `${user.userName}'s Squad`,
                    description: "",
                    members: [
                        {
                            userId: currentUserId,
                            role: currentUserRole,
                        },
                        {
                            userId: otherUserId,
                            role: otherUserRole,
                        },
                    ],
                    createdBy: currentUserId,
                    isPublic: true,
                });
                await squad.save();
            } else if (squad) {
                //agregar el usuario que falta al squad
                const currentUserInSquad = squad.members.some(
                    (m) => String(m.userId?._id || m.userId) === String(currentUserId)
                );
                const otherUserInSquad = squad.members.some(
                    (m) => String(m.userId?._id || m.userId) === String(otherUserId)
                );

                //verificar que no haya más de 5 miembros
                if (squad.members.length < 5) {
                    if (!currentUserInSquad && currentUserRole) {
                        //verificar que el rol no esté ocupado
                        const roleTaken = squad.members.some(
                            (m) => m.role === currentUserRole
                        );
                        if (!roleTaken) {
                            squad.members.push({
                                userId: currentUserId,
                                role: currentUserRole,
                            });
                        }
                    }

                    if (!otherUserInSquad && otherUserRole) {
                        //verificar que el rol no esté ocupado
                        const roleTaken = squad.members.some(
                            (m) => m.role === otherUserRole
                        );
                        if (!roleTaken) {
                            squad.members.push({
                                userId: otherUserId,
                                role: otherUserRole,
                            });
                        }
                    }

                    await squad.save();
                }
            }

            //sincronizar mySquad de TODOS los miembros del squad
            if (squad) {
                const { syncAllSquadMembers } = require("./squadController.js");
                await syncAllSquadMembers(squad._id);
            }

            //crear notificaciones para todos los miembros del squad cuando se agregan usuarios
            const { emitSquadNotification } = require("../sockets/notificationSocket.js");

            //obtener los miembros del squad antes de populate
            const squadBeforePopulate = await Squad.findById(squad._id).lean();
            const currentUserInSquad = squadBeforePopulate.members.some(
                (m) => String(m.userId) === String(currentUserId)
            );
            const otherUserInSquad = squadBeforePopulate.members.some(
                (m) => String(m.userId) === String(otherUserId)
            );

            //si el usuario actual se agregó al squad, notificar a los otros miembros
            if (currentUserInSquad) {
                const currentUserData = await User.findById(currentUserId).select("userName avatar");
                const otherMembers = squadBeforePopulate.members.filter(
                    (m) => String(m.userId) !== String(currentUserId)
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
                                _id: currentUserData._id,
                                userName: currentUserData.userName,
                                avatar: currentUserData.avatar,
                            },
                            type: "squad_joined",
                            status: "read",
                            createdAt: memberUser.squadNotifications[memberUser.squadNotifications.length - 1].createdAt,
                        };
                        emitSquadNotification(memberUser._id.toString(), notificationData);
                    }
                }
            }

            //si el otro usuario se agregó al squad, notificar a los otros miembros
            if (otherUserInSquad) {
                const otherUserData = await User.findById(otherUserId).select("userName avatar");
                const otherMembers = squadBeforePopulate.members.filter(
                    (m) => String(m.userId) !== String(otherUserId)
                );

                for (const member of otherMembers) {
                    const memberUser = await User.findById(member.userId);
                    if (memberUser) {
                        if (!memberUser.squadNotifications) {
                            memberUser.squadNotifications = [];
                        }

                        memberUser.squadNotifications.push({
                            fromUserId: otherUserId,
                            type: "squad_joined",
                            status: "read",
                            createdAt: getCurrentDateInTimezone(memberUser.preferences?.timezone || "Europe/Madrid"),
                        });

                        await memberUser.save();

                        //emitir notificación en tiempo real
                        const notificationData = {
                            _id: memberUser.squadNotifications[memberUser.squadNotifications.length - 1]._id,
                            fromUserId: {
                                _id: otherUserData._id,
                                userName: otherUserData.userName,
                                avatar: otherUserData.avatar,
                            },
                            type: "squad_joined",
                            status: "read",
                            createdAt: memberUser.squadNotifications[memberUser.squadNotifications.length - 1].createdAt,
                        };
                        emitSquadNotification(memberUser._id.toString(), notificationData);
                    }
                }
            }

            //emitir actualización de squad a TODOS los miembros del squad en tiempo real
            if (squad) {
                const { io } = require("../server.js");
                if (io) {
                    const squadData = await Squad.findById(squad._id)
                        .populate({
                            path: "members.userId",
                            select: "userName avatar lolProfile",
                        })
                        .lean();

                    const squadUpdateData = {
                        squadId: squad._id.toString(),
                        members: squadData.members.map((m) => ({
                            userId: String(m.userId._id),
                            userName: m.userId.userName,
                            avatar: m.userId.avatar,
                            role: m.role,
                        })),
                    };

                    const squadInfoData = {
                        squadId: squad._id.toString(),
                        name: squadData.name || "",
                        description: squadData.description || "",
                        members: squadUpdateData.members,
                        membersCount: squadUpdateData.members.length,
                    };

                    //emitir actualización de squad a TODOS los miembros del squad individualmente
                    squadData.members.forEach((member) => {
                        io.to(`user_${member.userId._id}`).emit("squad:updated", squadUpdateData);
                        io.to(`user_${member.userId._id}`).emit("squad:updated_info", squadInfoData);
                    });

                    //emitir actualización de squad a la sala del squad para usuarios que estén viendo el squad
                    io.to(`squad_${squad._id}`).emit("squad:updated", squadUpdateData);
                    io.to(`squad_${squad._id}`).emit("squad:updated_info", squadInfoData);

                    //emitir notificaciones de squad por broadcast a la sala del squad
                    const squadBeforePopulate = await Squad.findById(squad._id).lean();
                    const currentUserInSquad = squadBeforePopulate.members.some(
                        (m) => String(m.userId) === String(currentUserId)
                    );
                    const otherUserInSquad = squadBeforePopulate.members.some(
                        (m) => String(m.userId) === String(otherUserId)
                    );

                    if (currentUserInSquad) {
                        const currentUserData = await User.findById(currentUserId).select("userName avatar");
                        const broadcastNotificationData = {
                            fromUserId: {
                                _id: currentUserData._id,
                                userName: currentUserData.userName,
                                avatar: currentUserData.avatar,
                            },
                            type: "squad_joined",
                            status: "read",
                            squadId: squad._id.toString(),
                        };
                        io.to(`squad_${squad._id}`).emit("squad:new_notification", broadcastNotificationData);
                    }

                    if (otherUserInSquad) {
                        const otherUserData = await User.findById(otherUserId).select("userName avatar");
                        const broadcastNotificationData = {
                            fromUserId: {
                                _id: otherUserData._id,
                                userName: otherUserData.userName,
                                avatar: otherUserData.avatar,
                            },
                            type: "squad_joined",
                            status: "read",
                            squadId: squad._id.toString(),
                        };
                        io.to(`squad_${squad._id}`).emit("squad:new_notification", broadcastNotificationData);
                    }
                }
            }
        }

        //si esta es una notificación de aceptación de invitación, también eliminar la notificación de aceptación del otro usuario
        if (notification.type === "squad_invitation" && notification.status === "accepted" && notification.fromUserId) {
            const otherUserId = notification.fromUserId;
            const otherUser = await User.findById(otherUserId);

            if (otherUser && otherUser.squadNotifications) {
                //buscar y eliminar la notificación de aceptación del otro usuario
                otherUser.squadNotifications = otherUser.squadNotifications.filter(
                    (notif) => !(
                        notif.type === "squad_accepted" &&
                        notif.fromUserId?.toString() === currentUserId.toString()
                    )
                );
                await otherUser.save();
            }
        }

        //status 200: ok
        res.status(200).json({
            message: "Notification deleted successfully",
            user: userDTO(user)
        });
    } catch (err) {
        console.error("Error deleting notification:", err);
        //status 500: server error
        res.status(500).json({ message: "Error deleting notification ❌" });
    }
};

module.exports = {
    sendSquadInvitation,
    acceptSquadInvitation,
    rejectSquadInvitation,
    getSquadNotifications,
    deleteSquadNotification,
};