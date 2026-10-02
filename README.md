# Sueldo Simple

Calculadora mensual en HTML, CSS y JavaScript vanilla. Sin npm, CDN, servidor
ni compilación. Funciona directamente al abrir `index.html` en el navegador.

## Uso

1. Elige el mes e ingresa sueldo base y abono acumulado en pesos enteros,
   sin separadores de miles. El sueldo base inicial sugerido es $400.000.
2. Selecciona los días trabajados en el calendario. Cada día se puede activar
   con un toque, clic, Enter o barra espaciadora.
3. Revisa el resumen. Sábados pagan $20.000 y domingos $25.000.
4. Completa el nombre opcional y pulsa Liquidación PDF. En el diálogo de
   impresión, elige Guardar como PDF. El formato preparado es A4.

Los meses guardan sus propios montos, nombre y días en localStorage. El mes
actual se abre al iniciar; navegar a otro mes recupera sus datos. El registro
permanece en ese navegador y dispositivo. Si el almacenamiento no está disponible,
la aplicación lo informa y permite calcular e imprimir sin guardar.

Si un registro guardado está dañado, la app conserva el contenido original y
evita sobrescribirlo. El cálculo de esa sesión no se guarda. No se sincronizan
datos entre navegadores, dispositivos ni pestañas abiertas simultáneamente.

## Reglas De Dinero

Valor día = base / días de lunes a viernes del mes, redondeado al peso más cercano
(mitades hacia arriba). El pago normal usa ese valor diario redondeado. Por ejemplo,
$400.000 / 22 = $18.182, y 22 días trabajados suman $400.004. La interfaz y la
liquidación muestran la diferencia por redondeo.

El fin de semana recibe únicamente el extra fijo. El abono se resta del total;
un resultado negativo se conserva y se identifica como abono en exceso.
Se aceptan montos desde $0 hasta $1.000.000.000.000. Vacíos, negativos y decimales
bloquean el cálculo y la impresión. Feriados que caen de lunes a viernes cuentan
como días hábiles. No se calculan cotizaciones ni impuestos.

## Pruebas

Abre `tests.html` para ejecutar las 22 pruebas sin herramientas adicionales.
También puedes usar Node, sin instalar paquetes:

```sh
node tests.js
```

Cubren meses de 20 a 23 días hábiles, años bisiestos, alineación del calendario,
redondeo, extras, saldos, montos inválidos/grandes y persistencia por mes.

`browser-tests.cjs` es una verificación de desarrollo opcional con Playwright
y Chrome ya disponibles. Playwright no es una dependencia de la aplicación ni
de las pruebas financieras y no se necesita para usarla.

```sh
node browser-tests.cjs
```

El runner puede usar un Playwright disponible en `NODE_PATH` y otro navegador
instalado mediante `PLAYWRIGHT_CHANNEL`. Produce capturas, PDF de ejemplo y
evidencia en `artifacts/`. La verificación realizada está en
`specs/001-sueldo/verification.md`.

## Spec Driven Development Y SOLID

`AGENTS.md` dirige a `agent.md`, que establece las reglas del proyecto.
`specs/001-sueldo/` contiene especificación, contrato financiero, criterios de
aceptación, plan, tareas y evidencia. Actualiza primero la especificación cuando
cambies reglas y acompaña cada cambio financiero con una prueba observable.

`app.js` separa Calendar, Money, Selection, Salary, MonthRepository, SalaryView,
PrintService y SalaryController. La lógica de cálculo es pura; el controlador
recibe sus servicios por inyección y el repositorio recibe su almacenamiento.
Las responsabilidades están separadas sin agregar un framework ni un sistema de build.

Los iconos Lucide están incluidos localmente; atribución en `LICENSE-icons.txt`.
