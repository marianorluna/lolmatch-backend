# 🧭 Guía de Contribución – TFM Grupo Rojo

Esta guía establece las normas básicas para colaborar en este repositorio. Siguiendo estas pautas, mantenemos un flujo de trabajo ordenado, revisiones más fáciles y un historial de cambios claro.

## 🔀 Flujo de trabajo Gitflow

Usamos [Gitflow](https://www.atlassian.com/es/git/tutorials/comparing-workflows/gitflow-workflow) como modelo de ramas. Aquí están las principales:

### Ramas principales

- `main`: contiene el código listo para producción.
- `develop`: rama de integración donde se fusionan las features antes de lanzar.

### Ramas de soporte

- `feature/<nombre>`: para cada nueva funcionalidad o tarea.
- `release/<versión>`: para preparar una versión estable.
- `hotfix/<nombre>`: para corregir errores urgentes en producción.

### Ejemplo de flujo

1. Crear una rama de feature:

```bash
git checkout -b feature/login develop
```

2. Al terminar, hacer pull request hacia develop.

```bash
git add .
git commit -m "feat: add login endpoint"
git push origin feature/login
```

> Luego, se debe abrir un pull request desde Github. Se puede hacer manualmente desde la web. Cualquier miembro del equipo revisa el código. Si todo está bien, se fusiona con `develop`. Luego, cuando haya suficientes features, se lanza un `release`.

3. Para lanzar una versión:

```bash
git checkout -b release/v1.0 develop
```

4. Fusionar release en main y develop, y etiquetar:

```bash
git checkout main
git merge release/v1.0
git tag -a v1.0 -m "Versión 1.0"
git push origin main --tags
```

## ✅ Estándar común para mensajes de commit

### 1. Usa verbos en imperativo

Ejemplos:

- `Add login endpoint`
- `Fix bug in user authentication`
- `Update README with setup instructions`
- `Remove unused imports`

> Esto se basa en la idea de que cada commit es una instrucción para cambiar el estado del proyecto.

### 2. No uses punto final ni puntos suspensivos

- ❌ `Fix bug in login flow.`
- ✅ `Fix bug in login flow`

### 3. Limita el título del commit a 50 caracteres

- Si necesitas más contexto, usa el cuerpo del commit:
  ```jsx
  git commit -m "Add user profile endpoint" -m "Includes GET and PUT methods. Requires JWT auth."
  ```

### 4. Prefijos opcionales para categorizar

Podemos usar prefijos para facilitar la lectura:

- `feat:` → nueva funcionalidad
- `fix:` → corrección de errores
- `docs:` → documentación
- `refactor:` → mejora de código sin cambiar funcionalidad
- `test:` → pruebas
- `chore:` → tareas menores (configuración, dependencias)

Ejemplo:

```jsx
git commit -m "feat: add user registration endpoint"
```
