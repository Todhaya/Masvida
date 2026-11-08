# Bienvenida, perfil y tutoriales

Decidido por Alba el 6 de noviembre de 2026. Implementado en la app el 8 de noviembre (app/js/bienvenida.js); ayuda por apartado pendiente.

## 1. Primera entrada: el perfil busca tus ayudas (obligatorio, 2–3 minutos)
Tras registrarse, la persona configura el perfil antes de entrar. Se le explica desde la primera pantalla para qué sirve: **«Con estas preguntas buscamos las ayudas, bonos y deducciones que te pueden tocar.»** Cada pantalla recuerda en una línea qué ayuda depende de esa respuesta.

Pantallas (una pregunta por pantalla, barra de progreso, «Atrás»):
1. **¿Quién vive en casa?** Primera opción «Solo yo»; si no, adultos y peques con su edad (vale también para pareja o piso compartido). *«Para ayudas por hijos, familia numerosa o monoparental.»*
2. **¿Dónde vivís?** Código postal. *«Cada comunidad y ayuntamiento tiene sus propias ayudas.»*
3. **Ingresos de la casa, en tramos** (opcional, «Prefiero no decirlo»). *«Muchas ayudas dependen de los ingresos. No lo compartimos con nadie.»*
4. **Situaciones que dan derecho a ayudas** (marcar las que apliquen): familia numerosa o monoparental, discapacidad, desempleo, alquiler, hipoteca, estudiantes en casa. *«Solo para saber qué te corresponde.»*
5. **Tu vivienda y suministros:** alquiler o propiedad, calefacción de gas o eléctrica. *«Para el bono social y las ayudas de energía.»*

Final: **«Estas son las ayudas que te pueden corresponder»**, con cada ayuda, cuánto es, en qué estado está (probable, a comprobar) y el botón «Cómo pedirla». Debajo: «Lo decide la Administración; te avisamos si cambia algo». Botones «Entrar en Viwai» (lleva al tutorial general) y «Revisar mis respuestas».

Lo que no depende del perfil (menú, armario, tareas, calendario, ofertas, facturas) se configura dentro de cada apartado la primera vez que se usa.

## 2. Tutorial general (saltable)
Justo después del perfil: 4–5 tarjetas deslizables, una por bloque (Ahorro, Casa, Ofertas, Reembolso e invitaciones), con una frase y una captura. Botones «Saltar» en todas y «Empezar» al final. Se puede volver a ver desde «Tú › Ver el tutorial».

## 3. Ayuda en cada apartado (saltable)
La primera vez que se entra en un apartado: una tarjeta arriba con «Para qué sirve» (una frase) y «Cómo se usa» (2–3 pasos), con «Entendido» y «No volver a mostrar». Después queda un botón «?» junto al título para volver a abrirla. Opcionalmente, en el primer uso, resaltar el botón principal del apartado.

## Reglas
- Todo saltable menos el perfil mínimo (tamaño de la casa y código postal).
- Lo que se ha visto se guarda por persona, no por dispositivo, cuando la app esté conectada a Supabase.
- Textos breves, sin tecnicismos, en el tono de la web.

## Textos de los tutoriales

### Tutorial general (tarjetas deslizables, todas con «Saltar»)
1. **Ahorra en lo de siempre.** Revisamos tus facturas con tu consumo real y te decimos si pagas de más. También te avisamos de las ayudas que te tocan.
2. **La casa, en orden.** Menú y compra, tareas repartidas, armario de cada uno, calendario y papeles con aviso. Todo compartido con quien vive contigo.
3. **Ofertas que te sirven.** En tu súper, en la talla de tus peques y en lo que de verdad usas. También escapadas y planes.
4. **Una parte vuelve a ti.** Compra al mismo precio en las tiendas asociadas y te devolvemos hasta un 3 %. A partir de 10 € lo pasas a tu cuenta.
5. **Invita y sube de nivel.** Cada amiga que se une os da 3 € a las dos y sube tu porcentaje para siempre. → Botón «Empezar».

### Ayuda de cada apartado («Para qué sirve» · «Cómo se usa»)
- **Inicio** · Lo urgente de toda la casa en un vistazo. · 1) Mira «Hoy en casa». 2) Toca cualquier aviso para ir a él.
- **Facturas** · Saber si pagas de más en luz, gas, fibra o seguros. · 1) Elige qué revisar. 2) Sube una foto o el PDF. 3) Te enseñamos lo que ahorrarías y cambias en un clic. En seguros solo te recordamos la renovación.
- **Tu luz** · Ver tu consumo real hora a hora y la tarifa que te conviene. · 1) Autoriza en Datadis con tu DNI y el CUPS de la factura. 2) Te avisamos si otra tarifa te sale mejor.
- **Ayudas** · Las ayudas, bonos y deducciones que te pueden tocar. · 1) Revisa la lista. 2) Toca «Cómo pedirla» para ver los pasos y papeles. 3) Si cambia tu situación, actualiza el perfil.
- **Gasolina** · La gasolinera más barata cerca, con precios oficiales del día. · 1) Mira la lista. 2) Toca «Cómo llegar».
- **Ofertas** · Ofertas en lo que compras, con lo que te devolvemos al lado. · 1) Busca o entra en una categoría. 2) Toca «Ver oferta»: compras en la tienda al mismo precio.
- **Escapadas** · Planes y viajes según cuándo, dónde y con quién. · 1) Elige qué te apetece y tu presupuesto. 2) Reserva desde aquí y recupera una parte.
- **Tu reembolso** · Lo que te devolvemos por tus compras y lo que llevas acumulado. · 1) Lo pendiente se confirma cuando la tienda valida la compra. 2) Desde 10 € confirmados, «Retirar a mi cuenta».
- **Menú y compra** · Planificar las comidas y tener la lista hecha. · 1) Acepta o cambia los platos propuestos. 2) En «Compra» tienes la lista por pasillos. 3) Marca lo que ya tienes en casa.
- **Tareas** · Repartir las tareas de casa sin discutir. · 1) Elige por turnos o equilibrado. 2) Marca lo hecho y suma estrellas. 3) Canjead premios en «Premios».
- **Armario** · Saber qué tiene cada uno y qué se le ha quedado pequeño. · 1) Añade prendas con su talla. 2) Marca lo que se queda pequeño. 3) Te enseñamos qué le falta en su talla o lo vendes.
- **Lo que le falta** · Ofertas en la talla y el número de cada peque. · 1) Revisa por tipo de prenda. 2) Toca «Ver» para ir a la tienda.
- **Vender o pasar** · Dar una segunda vida a la ropa pequeña. · 1) Elige las prendas y su estado. 2) Te preparamos el anuncio con precio orientativo. 3) Publícalo en Vinted o Wallapop, o pásaselo a otra familia.
- **Calendario** · Quién lleva, quién recoge y qué toca cada día. · 1) Añade un plan y quién va. 2) Filtra por persona. 3) Marca los días en la otra casa.
- **Eventos** · Organizar un cumple o una celebración entre todos. · 1) Crea el evento y su presupuesto. 2) Reparte tareas. 3) Apunta los gastos compartidos.
- **Papeles y fechas** · Que no se te pase ninguna fecha: ITV, DNI, garantías, seguros. · 1) Añade la fecha o haz una foto del documento. 2) Te avisamos antes de que venza.
- **Pedidos** · Tus pedidos y plazos de devolución en un sitio. · 1) Reenvía los correos de pedidos a tu buzón de Viwai. 2) Te avisamos antes de que acabe el plazo de devolución.
- **Wallet** · Tus tarjetas de socio y cupones a mano. · 1) Añade la tarjeta con su código. 2) Enséñala en caja desde el móvil.
- **Mantenimiento** · Cuidar la casa a tiempo para evitar averías caras. · 1) Marca qué tienes en casa. 2) Dinos cuándo lo hiciste por última vez. 3) Te avisamos cuando toque.
- **Familia** · Quién vive en casa y quién la gestiona contigo. · 1) Añade miembros con su talla y edad. 2) Invita a otra persona adulta con su permiso.
- **Mi dinero** (de pago, más adelante) · Ver en qué se va el dinero, conectando tu banco. · 1) Conecta tu banco. 2) Revisa gastos por categoría y suscripciones.

## Casas de una persona
Si marca «Solo yo», el armario de peques y el reparto de tareas quedan ocultos (se pueden activar desde «Tú»), y los textos no hablan de peques ni de familia. La casa compartida sirve también para compañeros de piso.
