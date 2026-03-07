## Fase V2: Escalabilidad, Autenticación y Dashboard Visual

Basado en tus requerimientos, implementaremos los siguientes cambios sustanciales:

### 1. Autenticación y Multi-tenancy
- Iniciaremos el uso de `Firebase Auth` (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`).
- Crearemos el contexto **AuthContext**.
- Actualizaremos la estructura de Firestore. **Todas las colecciones (`accounts`, `transactions` y la nueva `categories`) tendrán el campo `uid`** para garantizar la segregación de información:
  `collection(db, "transactions"), where("uid", "==", currentUser.uid)`

### 2. Categorías Híbridas
- Nueva colección: `/users/{userId}/categories` que contendrá { `name`, `uid` }.
- El listado final de categorías en el `AddTransaction` será un `Set` derivado de:
  `['Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Servicios', ...categoriasDelUsuario]`
- Agregaremos un botón "Nueva Categoria" en el select para guardarla de inmediato.

### 3. Dashboard con Recharts
- Instalación de `recharts`.
- Nuevo componente `ExpensePieChart` en el Dashboard que agrupará el `$amount` consumido por cada categoría este mes y lo mostrará de forma vibrante.

### 4. Lógica de MSI Avanzada
- Actualmente guardamos `startMonth` y `endMonth`. Agregaremos `endDate` explícitamente (Fecha de compra + `msiMonths`).
- Calcularemos los "meses transcurridos" vs "meses totales" para mostrar una **barra de progreso** y texto informativo detallado sobre compras a MSI en la zona de Tarjetas (`Accounts.jsx`) o Deuda (`MSIDebt.jsx`).

### 5. Guía de Despliegue
- Entregaré un documento paso a paso para desplegar usando Vercel y configurando dominios y reglas de seguridad de Firebase en producción.

---

> [!IMPORTANT]
> Revisa este plan de extensión. Si todo está correcto, procederemos con la integración de Firebase Auth, Recharts y la refactorización de base de datos a Multi-usuario.
