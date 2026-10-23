-- Se remueve el cambio forzado de contraseña: limpiar el flag en usuarios existentes
UPDATE `User` SET `mustChangePassword` = false WHERE `mustChangePassword` = true;
