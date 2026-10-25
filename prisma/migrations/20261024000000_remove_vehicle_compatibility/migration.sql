-- AutoShopping 2.0: se elimina la funcionalidad de compatibilidad entre vehículos y productos.
-- El catálogo se organiza por productos, categorías, marcas, precios y disponibilidad.
DROP TABLE IF EXISTS `ProductVehicle`;
DROP TABLE IF EXISTS `VehicleModel`;
DROP TABLE IF EXISTS `VehicleMake`;
DELETE FROM `Permission` WHERE `resource` = 'vehicles';
