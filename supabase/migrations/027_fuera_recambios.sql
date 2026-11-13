-- Viwai · fuera recambios y embalaje (piezas de reloj, bolsitas y cajas para joyería). La carga ya lo filtra (filtro.mjs).
update productos set filtro_ok = false
where filtro_ok and f_unaccent(lower(titulo)) ~ '\m(repuestos?|de recambio|embalaje|para joyeria|bolsas? para joyas|cajas? para joyas|nh35|movimiento de reloj|esfera de reloj)\M';
