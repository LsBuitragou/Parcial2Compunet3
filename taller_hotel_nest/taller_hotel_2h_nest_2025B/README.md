# Taller Individual: NestJS - Sistema de Gestión de Hoteles

**NOTA:** Esta es una evaluación **SIN acceso a IA**. No puedes usar ChatGPT, Copilot, Claude ni herramientas similares.

---

## Descripción

Evaluación rápida (2 horas) para verificar tus habilidades en:
- Identificación y corrección de bugs
- Validación de datos con decoradores
- Implementación de CRUD básico
- TypeORM relaciones

**Contenido:**
- 5 bugs intencionales
- 12 validaciones por agregar (3 DTOs)
- 10 métodos por implementar
- 5 endpoints por crear

---

## Objetivos

1. **Encontrar y corregir 5 bugs** 
2. **Agregar validaciones simples** (@IsNotEmpty, @IsEmail, @Min, @Max)
3. **Implementar CRUD básico** (Update, Delete en 3 servicios)
4. **Pasar tests**

---

## Requisitos Previos

- Node.js 20+
- Conocimiento básico de NestJS
- Entendimiento de TypeORM
- VS Code o editor similar

---

## Setup (Primeros 5 minutos)

```bash
# 1. Descargar
git clone <URL>
cd taller_nestjs_individual

# 2. Instalar
npm install

# 3. Iniciar servidor
npm run start:dev

# 4. En otra terminal, ejecutar tests
npm test
```

**Deber ver:** La app escuchando en puerto 3000 y algunos tests fallando.

---

## Los 5 Bugs


## Validaciones 

Agrega validadores a 3 DTOs. Total: **12 validaciones**

### CreateUserDto (4 validaciones)

### CreateHotelDto (4 validaciones)

### CreateRoomDto (4 validaciones)

---

## Implementar Métodos (60 minutos)

---

## Implementación Rápida
---

## Tests (Final 10 minutos)

```bash
# Correr tests
npm test

# Deberías ver algo como:
# ✓ HotelService (3)
# ✓ RoomService (3)
# ✓ UserService (2)
# ✓ AppController (1)

# Si fallan, lee el error - te dice exactamente qué falta
```

**Entrega:** Haz commit y push antes de las 2 horas.
