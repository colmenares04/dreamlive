Actua como un Ingeniero Informático con experiencia en TypeScript, React y desarrollo de extensiones de navegador (Manifest V3), especializado en la arquitectura MV3 y el uso de Web Workers para tareas pesadas.


# PROHIBIDO EL HARDCODEO DE VALORES QUE NO SON ESTRICTAMENTE NECESARIOS 
# PARA LA FUNCIONALIDAD, POR EJEMPLO, EN EL ENPOINT, NO ES NECESARIO HARDCODEAR EL VALOR DEL DOMINIO DE LA API. EN SU LUGAR 
# SE DEBE UTILIZAR UNA VARIABLE DE ENTORNO. (POR EJEMPLO API_URL)

# BUENAS PRÁCTICA Y DOCUMENTACIÓN. 

# CADA VEZ QUE HAGAS UN SERVICIOS O ALGO QUE CONSULTAR CON LA API, VERIFICA QUE EL ENDPOINT RECIBA EL FORMATO CORRECTO QUE ESTÁS ENVIANDO.

Te presento un problema que tengo con mi extensión de navegador.

Error 1: 
INFO:     172.19.0.1:55274 - "OPTIONS /api/v1/leads/keywords HTTP/1.1" 400 Bad Request
INFO:     172.19.0.1:55274 - "OPTIONS /api/v1/leads/keywords?license_id=5563b693-7e6a-4a33-82fa-4abf85d48d7f HTTP/1.1" 400 Bad Request

Error 2: 

Lo de ruta incorrecta, creo que sucede por que no está comprobando cada cierto tiempo si ya estamos en la ruta correcta, así que se queda con el dato antes de viajar ahí.


Error 3:

El botón de verificar disponibilidad no está funcionando, no aparece la cantidad de recopilados pendientes y parece que no está consultando nada a la API.

2026-05-02 17:06:59 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (24.9ms)

2026-05-02 17:07:03 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (17.6ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:07:07 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (17.6ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:07:11 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (18.5ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:07:15 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (16.5ms)

2026-05-02 17:07:19 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (18.2ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:07:23 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (15.8ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:07:27 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (16.1ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:07:31 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (24.3ms)

2026-05-02 17:07:35 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (22.4ms)

INFO:     172.19.0.1:44102 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:08:08 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (35.2ms)

INFO:     172.19.0.1:45482 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:08:10 [INFO] dreamlive – GET /api/v1/licenses/metrics → 200 (20.4ms)

INFO:     172.19.0.1:45482 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK

2026-05-02 17:08:11 [INFO] dreamlive.chat – WS Desconectado para 5563b693-7e6a-4a33-82fa-4abf85d48d7f

INFO:     connection closed

2026-05-02 17:08:14 [INFO] dreamlive – POST /api/v1/licenses/templates → 200 (28.2ms)

📥 [POST /templates] Recibiendo tags: ['Normal'] para ID: 5563b693-7e6a-4a33-82fa-4abf85d48d7f

✅ [POST /templates] Guardado exitoso.

INFO:     172.19.0.1:45482 - "POST /api/v1/licenses/templates HTTP/1.1" 200 OK


ERROR 4: 

INFO:     172.19.0.1:45482 - "GET /api/v1/licenses/metrics HTTP/1.1" 200 OK
Guarda métricas en localstorage, que solo cambie cuando se actualice, así evitamos el constante gasto de recursos consultando a la API.
