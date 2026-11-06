-- Viwai · BORRA todas las tablas y funciones de Viwai para volver a crear el esquema desde cero.
-- Solo para la puesta en marcha, cuando aún no hay datos reales. Después: ejecutar 001 y 002.
drop table if exists invitaciones_casa, eventos, lista_espera, invitaciones, movimientos,
  comisiones, clics, modulos, facturas, perfiles, personas, cuentas, hogares cascade;
drop function if exists unirse_casa(text), mi_permiso(), amigas_activas(), crear_hogar(text), mi_hogar() cascade;
