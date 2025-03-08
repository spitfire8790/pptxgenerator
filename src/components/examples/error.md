Response content type: application/json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
screenshot.js?t=1741318345817:1806 Road features response: {displayFieldName: 'roadnameba', fieldAliases: {…}, geometryType: 'esriGeometryPolyline', spatialReference: {…}, fields: Array(3), …}
screenshot.js?t=1741318345817:1809 Found 22 road features
screenshot.js?t=1741318345817:1841 Converted and deduplicated features: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
screenshot.js?t=1741318345817:1872 Retrieved road features: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
screenshot.js?t=1741318345817:1900 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eaa-fb55-7e4d-a39b-0f7eb121c317', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:14 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318345817:1929 Loading roads layer...
screenshot.js?t=1741318345817:1953 Requesting roads layer through proxy... https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-070c-7a92-95ea-cfab135f6fcf', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:17 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-12bb-7d0e-9994-9ce487123079', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:20 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-1a94-7b41-be90-7d8e539e38fc', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:22 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-264c-7a8e-8443-e6a9eea5a883', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:25 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-3205-7777-8c33-581ed0e8f9b7', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:28 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-3dbc-7bf5-aff1-88725d7e3911', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:31 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-4976-78d8-a390-1a2d30f57b37', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:34 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-552c-777e-9eb2-57efdb367589', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:37 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-60e5-779e-95c9-5e15b6cd0b1e', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:40 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-6469-74a1-842e-0c8d5d046b8d', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:41 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-64c3-7593-bf2c-d2bb43e3f37d', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:41 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-6c9c-7b1b-b89e-3c101d5378b0', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:43 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-7b62-715a-9245-dfda1b0802c5', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:46 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-840c-7cc7-838a-98ee0bbff227', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:49 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: image/png
screenshot.js?t=1741318345817:1958 Loading roads image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/4a941aad-f3fb-4e9a-a3c7-600dd30cc6de
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/4a941aad-f3fb-4e9a-a3c7-600dd30cc6de
screenshot.js?t=1741318345817:1960 Roads layer loaded successfully
screenshot.js?t=1741318345817:1975 Loading road labels layer...
screenshot.js?t=1741318345817:1985 Labels bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js?t=1741318345817:2000 Requesting road labels through proxy... https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: sixmaps/LPI_RasterLabels_1
proxyService.js:73 Proxy request details: {url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-8fbb-7ef5-9481-8e8dca255502', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:52 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: image/png
screenshot.js?t=1741318345817:2007 Loading road labels from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/78a43b05-c2f5-46d0-8e4a-67e2a576a9b1
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/78a43b05-c2f5-46d0-8e4a-67e2a576a9b1
screenshot.js?t=1741318345817:2009 Road labels loaded successfully
screenshot.js?t=1741318345817:2017 Drawing developable area boundaries...
screenshot.js?t=1741318345817:2034 Drawing single feature
screenshot.js?t=1741318345817:2764 Starting UDP precinct map capture...
screenshot.js?t=1741318345817:2789 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16801816.61252013%2C-4014753.709811162%2C16803701.356139317%2C-4012868.9661919754&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-9794-7592-9233-bf6323f28630', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:54 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16801816.61252013%2C-4014753.709811162%2C16803701.356139317%2C-4012868.9661919754&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318345817:2818 Loading LMR layers...
screenshot.js?t=1741318345817:2841 Requesting LMR layers through proxy... https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=150.93328664%2C-33.89675092499999%2C150.95021757999996%2C-33.87981998500001&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=150.93328664%2C-33.89675092499999%2C150.95021757999996%2C-33.87981998500001&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:73 Proxy request details: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:115 Fetch failed loading: POST "https://proxy-server.jameswilliamstrutt.workers.dev/".
proxyRequest @ proxyService.js:115
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2843
await in captureUDPPrecinctMap
generatePropertyReport @ ReportGenerator.jsx:811
proxyService.js:115 
            
            
           POST https://proxy-server.jameswilliamstrutt.workers.dev/ 500 (Internal Server Error)
proxyRequest @ proxyService.js:115
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2843
await in captureUDPPrecinctMap
generatePropertyReport @ ReportGenerator.jsx:811Understand this errorAI
proxyService.js:125 Proxy request failed: {status: 500, statusText: '', error: '<html lang="en">\r\n<head>\r\n<title>\r\nError: Error ex…"color:#ff6666"> </div></div>\r\n</body>\r\n</html>\r\n'}
(anonymous) @ rrweb-plugin-console-record.js:2447
proxyRequest @ proxyService.js:125
await in proxyRequest
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2843
await in captureUDPPrecinctMap
generatePropertyReport @ ReportGenerator.jsx:811Understand this errorAI
proxyService.js:180 Proxy request error: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', error: 'Proxy request failed: . <html lang="en">\r\n<head>\r\n…"color:#ff6666"> </div></div>\r\n</body>\r\n</html>\r\n', stack: 'Error: Proxy request failed: . <html lang="en">\r\n<…txApp/ReportGenerator.jsx?t=1741318406437:729:47)'}
(anonymous) @ rrweb-plugin-console-record.js:2447
proxyRequest @ proxyService.js:180
await in proxyRequest
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2843
await in captureUDPPrecinctMap
generatePropertyReport @ ReportGenerator.jsx:811Understand this errorAI
screenshot.js?t=1741318345817:2900 Failed to load LMR layers: Error: Proxy request failed: . <html lang="en">
<head>
<title>
Error: Error exporting map</title>
<link href="/sarcgis/rest/static/main.css" rel="stylesheet" type="text/css"/>
</head>
<body>
<table width="100%" class="userTable">
<tr>
<td class="titlecell">ArcGIS REST Framework</td>
</tr>
</table>
<table width="100%" class="navTable">
<tr valign="top">
<td class="breadcrumbs">
<a href="/sarcgis/rest/services">Home</a>
</td>
</tr>
</table>
<div class="cbody">
<br/>
<br/>
<b>Error: </b>Error exporting map<br/>
<b>Code: </b>500<br/><br/>
<div style="color:#ff6666"> </div></div>
</body>
</html>

    at proxyRequest (proxyService.js:130:15)
    at async captureUDPPrecinctMap (screenshot.js?t=1741318345817:2843:27)
    at async generatePropertyReport (ReportGenerator.jsx:811:46)
(anonymous) @ rrweb-plugin-console-record.js:2447
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2900
await in captureUDPPrecinctMap
generatePropertyReport @ ReportGenerator.jsx:811Understand this warningAI
screenshot.js?t=1741318345817:2905 Loading UDP precincts...
25Fetch finished loading: GET "<URL>".
screenshot.js?t=1741318345817:2910 Drawing 170 UDP precinct features...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 1...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 2...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 3...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 4...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 5...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 6...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 7...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 8...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 9...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 10...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 11...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 12...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 13...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 14...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 15...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 16...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 17...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 18...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 19...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 20...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 21...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 22...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 23...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 24...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 25...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 26...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 27...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 28...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 29...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 30...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 31...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 32...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 33...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 34...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 35...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 36...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 37...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 38...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 39...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 40...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 41...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 42...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 43...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 44...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 45...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 46...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 47...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 48...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 49...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 50...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 51...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 52...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 53...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 54...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 55...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 56...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 57...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 58...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 59...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 60...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 61...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 62...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 63...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 64...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 65...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 66...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 67...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 68...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 69...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 70...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 71...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 72...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 73...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 74...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 75...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 76...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 77...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 78...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 79...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 80...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 81...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 82...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 83...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 84...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 85...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 86...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 87...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 88...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 89...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 90...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 91...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 92...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 93...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 94...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 95...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 96...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 97...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 98...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 99...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 100...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 101...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 102...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 103...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 104...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 105...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 106...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 107...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 108...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 109...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 110...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 111...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 112...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 113...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 114...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 115...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 116...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 117...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 118...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 119...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 120...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 121...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 122...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 123...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 124...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 125...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 126...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 127...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 128...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 129...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 130...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 131...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 132...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 133...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 134...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 135...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 136...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 137...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 138...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 139...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 140...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 141...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 142...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 143...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 144...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 145...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 146...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 147...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 148...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 149...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 150...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 151...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 152...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 153...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 154...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 155...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 156...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 157...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 158...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 159...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 160...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 161...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 162...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 163...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 164...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 165...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 166...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 167...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 168...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 169...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 170...
screenshot.js?t=1741318345817:3010 Drawing single feature
screenshot.js?t=1741318345817:3087 Starting PTAL map capture with feature: {featureId: 'FxNgijC5sGVmQhYxQy3B3', featureType: 'Polygon', coordinates: 1, developableArea: 'provided'}
screenshot.js?t=1741318345817:3100 Using config: {width: 2048, height: 2048, padding: 1}
screenshot.js?t=1741318345817:3104 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003907139999995479}
screenshot.js?t=1741318345817:3111 Created canvas with dimensions: {width: 2048, height: 2048}
screenshot.js?t=1741318345817:3115 Calculated Mercator bbox: 16802541.513912123,-4014028.808419167,16802976.454747323,-4013593.8675839705
screenshot.js?t=1741318345817:3133 Prepared aerial parameters: {SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetMap', BBOX: '16802541.513912123,-4014028.808419167,16802976.454747323,-4013593.8675839705', CRS: 'EPSG:3857', …}
screenshot.js?t=1741318345817:3139 Using PTAL config: {layerId: 28919}
screenshot.js?t=1741318345817:3142 Fetching project layers from Giraffe...
screenshot.js?t=1741318345817:3144 Retrieved project layers count: 84
screenshot.js?t=1741318345817:3147 Found PTAL layer: {found: true, id: 28919, name: 'PTAL_6am-10am (AVG)', defaultGroup: 'Esri FeatureServer', vectorSource: 'present'}
screenshot.js?t=1741318345817:3172 Vector tile URL: https://layers-node-ehcce5pxxq-ts.a.run.app/featureServer/{z}/{x}/{y}/https%3A%2F%2Fportal.data.nsw.gov.au%2Farcgis%2Frest%2Fservices%2FHosted%2FPTAL_6to10amAVG%2FFeatureServer%2F0%2Fquery%3Fwhere%3D1%3D1%26geometry%3D%7Bbbox-epsg-3857%7D%26geometryType%3DesriGeometryEnvelope%26inSR%3D3857%26spatialRel%3DesriSpatialRelIntersects%26returnGeodetic%3Dfalse%26outFields%3D%2A%26returnGeometry%3Dtrue%26returnCentroid%3Dfalse%26featureEncoding%3DesriDefault%26multipatchOption%3DxyFootprint%26applyVCSProjection%3Dfalse%26returnIdsOnly%3Dfalse%26returnUniqueIdsOnly%3Dfalse%26returnCountOnly%3Dfalse%26returnExtentOnly%3Dfalse%26returnQueryGeometry%3Dfalse%26returnDistinctValues%3Dfalse%26cacheHint%3Dfalse%26returnZ%3Dfalse%26returnM%3Dfalse%26returnExceededLimitFeatures%3Dtrue%26f%3Dgeojson%26token%3DRXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
screenshot.js?t=1741318345817:3180 Decoded URL: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query?where=1=1&geometry={bbox-epsg-3857}&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&returnZ=false&returnM=false&returnExceededLimitFeatures=true&f=geojson&token=RXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
screenshot.js?t=1741318345817:3189 Using exact URL from vector tiles: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query
screenshot.js?t=1741318345817:3192 Extracted token: RXyZib9F4v...
screenshot.js?t=1741318345817:3210 Prepared PTAL parameters: {where: '1=1', geometry: '16802541.513912123,-4014028.808419167,16802976.454747323,-4013593.8675839705', geometryType: 'esriGeometryEnvelope', inSR: '3857', spatialRel: 'esriSpatialRelIntersects', …}
screenshot.js?t=1741318345817:3216 Preparing to request: {aerialUrl: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…I=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300', ptalUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…eturnGeometry=true&f=geojson&token=***redacted***'}
screenshot.js?t=1741318345817:3222 Loading aerial and PTAL layers in parallel...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802541.513912123%2C-4014028.808419167%2C16802976.454747323%2C-4013593.8675839705&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query/query?where=1%3D1&geometry=16802541.513912123%2C-4014028.808419167%2C16802976.454747323%2C-4013593.8675839705&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=geojson&token=RXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…O-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC', method: 'GET', bodySize: 'no body', headers: undefined}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…O-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 30000ms
proxyService.js:134 Response content type: text/html
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event sent",{"event":"pusher:ping","data":{}}]
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event recd",{"event":"pusher:pong","data":{}}]
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-a4fa-7bea-a72d-16073ca89f02', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:34:57 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802541.513912123%2C-4014028.808419167%2C16802976.454747323%2C-4013593.8675839705&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318345817:3229 Loaded both layers: {baseMapLoaded: true, ptalResponseFeatures: undefined}
screenshot.js?t=1741318345817:3236 Drew base map
screenshot.js?t=1741318345817:3316 No PTAL features found in response
screenshot.js?t=1741318345817:3331 Drawing single feature
screenshot.js?t=1741318345817:3335 PTAL map capture completed successfully
accessSlide.js?t=1741318406437:80 Starting to add access slide...
screenshot.js?t=1741318345817:1853 Starting roads capture... {featureType: 'Polygon', hasMultipleFeatures: false, developableAreaFeatures: 1}
screenshot.js?t=1741318345817:140 Invalid feature geometry for bounds calculation {type: 'Polygon', coordinates: Array(1), properties: {…}, site_suitability__LGA: 'Fairfield'}
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js?t=1741318345817:140
captureRoadsMap @ screenshot.js?t=1741318345817:1867
addAccessSlide @ accessSlide.js?t=1741318406437:107
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js?t=1741318345817:160 No valid coordinates found for bounds calculation
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js?t=1741318345817:160
captureRoadsMap @ screenshot.js?t=1741318345817:1867
addAccessSlide @ accessSlide.js?t=1741318406437:107
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
screenshot.js?t=1741318345817:1870 Fetching road features...
screenshot.js?t=1741318345817:1783 Fetching road features with params: {centerX: 0, centerY: 0, size: 1000}
screenshot.js?t=1741318345817:1788 Query bbox (expanded): -600,-600,600,600
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/0/query?f=json&geometry=-600%2C-600%2C600%2C600&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=ROADNAMEST%2CFUNCTION%2CLANECOUNT&returnGeometry=true&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…e&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…e&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 120000ms
proxyService.js:134 Response content type: application/json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
screenshot.js?t=1741318345817:1806 Road features response: {displayFieldName: 'roadnameba', fieldAliases: {…}, geometryType: 'esriGeometryPolyline', spatialReference: {…}, fields: Array(3), …}
screenshot.js?t=1741318345817:1809 Found 2000 road features
screenshot.js?t=1741318345817:1841 Converted and deduplicated features: (474) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
screenshot.js?t=1741318345817:1872 Retrieved road features: (474) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
screenshot.js?t=1741318345817:1900 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:31 loadImage: Failed to load image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300 Event {isTrusted: true, type: 'error', target: img, currentTarget: img, eventPhase: 2, …}
(anonymous) @ rrweb-plugin-console-record.js:2447
img.onerror @ image.js:31Understand this errorAI
image.js:36 Using fallback transparent image
screenshot.js?t=1741318345817:1929 Loading roads layer...
screenshot.js?t=1741318345817:1953 Requesting roads layer through proxy... https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
screenshot.js?t=1741318345817:1958 Loading roads image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/f7e386b3-9d3a-448d-a811-88225cb790e2
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/f7e386b3-9d3a-448d-a811-88225cb790e2
screenshot.js?t=1741318345817:1960 Roads layer loaded successfully
screenshot.js?t=1741318345817:1975 Loading road labels layer...
screenshot.js?t=1741318345817:1985 Labels bbox: -55659745.38888889,-55659745.38888889,55659745.38888889,55659745.38888889
screenshot.js?t=1741318345817:2000 Requesting road labels through proxy... https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: sixmaps/LPI_RasterLabels_1
proxyService.js:73 Proxy request details: {url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-aedd-7b1a-acfb-ad0565259949', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:00 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: image/png
screenshot.js?t=1741318345817:2007 Loading road labels from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/10bc9379-c543-45ac-a522-1d9ef66ed3e6
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/10bc9379-c543-45ac-a522-1d9ef66ed3e6
screenshot.js?t=1741318345817:2009 Road labels loaded successfully
screenshot.js?t=1741318345817:2017 Drawing developable area boundaries...
screenshot.js?t=1741318345817:2034 Drawing single feature
scoringLogic.js:1368 === Roads Score Calculation Start ===
scoringLogic.js:1369 Raw road features: [
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          144.81698176131306,
          -36.07518262853864
        ],
        [
          144.81753632688662,
          -36.07525045000972
        ],
        [
          144.81761307648162,
          -36.07525983529655
        ]
      ]
    },
    "properties": {
      "ROADNAMEST": "OLD BARMAH ROAD",
      "FUNCTION": "LocalRoad",
      "LANECOUNT": "1"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          151.00962993177552,
          -30.771265240289495
        ],
        [
          151.00976131682728,
          -30.771027739645035
        ],
        [
          151.00984314003483,
          -30.770777070914164
        ],
        [
          151.0099132473207,
          -30.77053135030019
        ],
        [
          151.01003408176825,
          -30.77027551831702
        ],
        [
          151.01015046111786,
          -30.770132184280214
        ],
        [
          151.01032795688172,
          -30.77000634793194
        ],
        [
          151.01050666278275,
          -30.769873949950465
        ],
        [
          151.0106929432468,
          -30.76972051350839
        ],
        [
          151.01086022903758,
          -30.769596362388313
        ],
        [
          151.0112265241437,
          -30.769430851465472
        ],
        [
          151.01147237921737,
          -30.76939578437657
        ],
        [
          151.0116509954786,
          -30.769369950186785
        ],
        [
          151.0118543164682,
          -30.769258008007228
        ],
        [
          151.01189348009586,
          -30.769214389281558
        ],
        [
          151.01209486486584,
          -30.768978000170534
        ],
        [
          151.0121585987622,
          -30.768942180107274
        ],
        [
          151.01234651963443,
          -30.768879665312227
        ],
        [
          151.01250373887592,
          -30.76888161049584
        ],
        [
          151.01269083506213,
          -30.768938971002513
        ],
        [
          151.01294540312415,
          -30.769014662847894
        ],
        [
          151.01310873579985,
          -30.769073834078483
        ],
        [
          151.0134203954492,
          -30.76923187800611
        ],
        [
          151.01357316855672,
          -30.76933910513236
        ],
        [
          151.01375483257118,
          -30.769532153401087
        ],
        [
          151.01381678263544,
          -30.769613824220926
        ],
        [
          151.01401425911024,
          -30.76974616841858
        ],
        [
          151.01408205368932,
          -30.769791597868107
        ],
        [
          151.01420982625723,
          -30.76989298047954
        ],
        [
          151.01442343789563,
          -30.77010270175066
        ],
        [
          151.01469696477488,
          -30.770345240151812
        ],
        [
          151.01482029120882,
          -30.770573785780527
        ],
        [
          151.01493094257535,
          -30.770767282248244
        ],
        [
          151.0149983517034,
          -30.770885158582473
        ],
        [
          151.01514476934926,
          -30.771104426492116
        ],
        [
          151.01517856355304,
          -30.77114717571169
        ],
        [
          151.015206997297,
          -30.771183139198627
        ]
      ]
    },
    "properties": {
      "ROADNAMEST": "MANGANESE MOUNTAIN FIRETRAIL",
      "FUNCTION": "Track-Vehicular",
      "LANECOUNT": "1"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          150.87575803895083,
          -29.615914612068707
        ],
        [
          150.87575803895083,
          -29.615464898166692
        ],
        [
          150.87572472880197,
          -29.614965219041324
        ],
        [
          150.87564977200293,
          -29.614423902229817
        ],
        [
          150.87566271598973,
          -29.61419045330416
        ],
        [
          150.87566989613754,
          -29.61384837887141
        ]
      ]
    },
    "properties": {
      "ROADNAMEST": "DELUNGRA ROAD",
      "FUNCTION": "ArterialRoad",
      "LANECOUNT": "1"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          149.24975591979432,
          -34.895370312403315
        ],
        [
          149.24996656435542,
          -34.894833190734346
        ],
        [
          149.2501333123074,
          -34.89447419230777
        ],
        [
          149.2501359387535,
          -34.89446419747031
        ],
        [
          149.25023581541632,
          -34.894089691358715
        ],
        [
          149.25082556461064,
          -34.89164106374761
        ],

scoringLogic.js:1370 Raw developable area: [
  {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            150.9416163,
            -33.88824365
          ],
          [
            150.94142515,
            -33.88875662
          ],
          [
            150.94158416,
            -33.88879424
          ],
          [
            150.94160311,
            -33.88878877
          ],
          [
            150.9418188,
            -33.88853165
          ],
          [
            150.94206536,
            -33.88833777
          ],
          [
            150.9416163,
            -33.88824365
          ]
        ]
      ]
    },
    "properties": {
      "id": "_PuEfAU-rPHMYpbTyXwGc",
      "appId": "1",
      "usage": "Developable Area",
      "public": true,
      "layerId": "Dev Area A",
      "projectId": "50986"
    }
  }
]
scoringLogic.js:1371 All properties: none
scoringLogic.js:1384 Processing developable area 1...
scoringLogic.js:1388 Created developable polygon 1
scoringLogic.js:1392 Creating buffer of 50 meters around developable area 1
scoringLogic.js:1412 Processing 474 road features for area 1
scoringLogic.js:1453 Found nearby road for area 1: {name: ' ', function: 'UrbanServiceLane', laneCount: 1}
scoringLogic.js:1467 
Nearby roads for all areas: [{…}]
scoringLogic.js:1496 Final score: 2 (Multiple lanes: false)
screenshot.js?t=1741318345817:2764 Starting UDP precinct map capture...
screenshot.js?t=1741318345817:140 Invalid feature geometry for bounds calculation {type: 'Polygon', coordinates: Array(1), properties: {…}, site_suitability__LGA: 'Fairfield'}coordinates: [Array(10)]properties: {roadFeatures: Array(474), udpPrecincts: Array(170), ptalValues: Array(2000), site_suitability__LGA: 'Fairfield'}site_suitability__LGA: "Fairfield"type: "Polygon"[[Prototype]]: Object
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js?t=1741318345817:140
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2781
addAccessSlide @ accessSlide.js?t=1741318406437:145
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js?t=1741318345817:160 No valid coordinates found for bounds calculation
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js?t=1741318345817:160
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2781
addAccessSlide @ accessSlide.js?t=1741318406437:145
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
screenshot.js?t=1741318345817:2789 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:31 loadImage: Failed to load image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300 Event {isTrusted: true, type: 'error', target: img, currentTarget: img, eventPhase: 2, …}
(anonymous) @ rrweb-plugin-console-record.js:2447
img.onerror @ image.js:31Understand this errorAI
image.js:36 Using fallback transparent image
screenshot.js?t=1741318345817:2818 Loading LMR layers...
screenshot.js?t=1741318345817:2841 Requesting LMR layers through proxy... https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-500%2C-500%2C500%2C500&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-500%2C-500%2C500%2C500&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:73 Proxy request details: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
screenshot.js?t=1741318345817:2845 Loading LMR image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/96f91d1b-099a-47cb-bfd5-22a918d83f8f
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/96f91d1b-099a-47cb-bfd5-22a918d83f8f
screenshot.js?t=1741318345817:2847 LMR layers loaded successfully
screenshot.js?t=1741318345817:2891 Invalid feature for LMR overlap check
(anonymous) @ rrweb-plugin-console-record.js:2447
captureUDPPrecinctMap @ screenshot.js?t=1741318345817:2891
await in captureUDPPrecinctMap
addAccessSlide @ accessSlide.js?t=1741318406437:145
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js?t=1741318345817:2905 Loading UDP precincts...
screenshot.js?t=1741318345817:2910 Drawing 170 UDP precinct features...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 1...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 2...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 3...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 4...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 5...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 6...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 7...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 8...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 9...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 10...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 11...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 12...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 13...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 14...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 15...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 16...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 17...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 18...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 19...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 20...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 21...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 22...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 23...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 24...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 25...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 26...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 27...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 28...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 29...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 30...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 31...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 32...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 33...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 34...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 35...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 36...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 37...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 38...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 39...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 40...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 41...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 42...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 43...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 44...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 45...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 46...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 47...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 48...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 49...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 50...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 51...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 52...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 53...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 54...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 55...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 56...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 57...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 58...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 59...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 60...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 61...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 62...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 63...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 64...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 65...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 66...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 67...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 68...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 69...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 70...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 71...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 72...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 73...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 74...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 75...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 76...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 77...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 78...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 79...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 80...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 81...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 82...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 83...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 84...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 85...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 86...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 87...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 88...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 89...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 90...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 91...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 92...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 93...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 94...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 95...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 96...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 97...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 98...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 99...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 100...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 101...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 102...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 103...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 104...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 105...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 106...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 107...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 108...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 109...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 110...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 111...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 112...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 113...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 114...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 115...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 116...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 117...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 118...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 119...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 120...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 121...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 122...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 123...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 124...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 125...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 126...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 127...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 128...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 129...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 130...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 131...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 132...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 133...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 134...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 135...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 136...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 137...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 138...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 139...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 140...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 141...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 142...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 143...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 144...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 145...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 146...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 147...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 148...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 149...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 150...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 151...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 152...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 153...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 154...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 155...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 156...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 157...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 158...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 159...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 160...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 161...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 162...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 163...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 164...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 165...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 166...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 167...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 168...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 169...
screenshot.js?t=1741318345817:2923 Drawing UDP precinct feature 170...
screenshot.js?t=1741318345817:3010 Drawing single feature
accessSlide.js?t=1741318406437:162 LMR overlap data for scoring: {hasOverlap: false, primaryOverlap: null, pixelCounts: {…}}
accessSlide.js?t=1741318406437:163 Developable area LMR overlap for scoring: []
scoringLogic.js:1537 === UDP Precincts Score Calculation Start ===
scoringLogic.js:1538 Input validation:
scoringLogic.js:1539 precinctFeatures: {
  "0": {
    "type": "Feature",
    "id": 1,
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            150.74280006000004,
            -33.89809970712612
          ],
          [
            150.7420364630001,
            -33.89788295012608
          ],
          [
            150.74199094400012,
            -33.897918923126106
          ],
          [
            150.74196275300005,
            -33.89794320712613
          ],
          [
            150.74193311800002,
            -33.89796082112611
          ],
          [
            150.7418614510001,
            -33.89802097812613
          ],
          [
            150.74181359200009,
            -33.898115548126114
          ],
          [
            150.74181326000007,
            -33.898226441126106
          ],
          [
            150.74178178800003,
            -33.89826424212614
          ],
          [
            150.7415948250001,
            -33.898235898126096
          ],
          [
            150.74137445500003,
            -33.8981723271261
          ],
          [
            150.74120996600004,
            -33.89822066812611
          ],
          [
            150.7411177990001,
            -33.898309743126106
          ],
          [
            150.74096696200002,
            -33.8984897491261
          ],
          [
            150.7409849070001,
            -33.89863584512608
          ],
          [
            150.74102017200005,
            -33.898771156126095
          ],
          [
            150.74097432100007,
            -33.898918918126135
          ],
          [
            150.74076125700003,
            -33.89894101512612
          ],
          [
            150.74056220300008,
            -33.89897395712609
          ],
          [
            150.74042253400012,
            -33.8990376821261
          ],
          [
            150.74038771900007,
            -33.89911333812609
          ],
          [
            150.74036817600006,
            -33.899135838126085
          ],
          [
            150.74023940900008,
            -33.899168923126105
          ],
          [
            150.7400255550001,
            -33.89909455012611
          ],
          [
            150.73997931000008,
            -33.899015110126136
          ],
          [
            150.7399279550001,
            -33.89883377812612
          ],
          [
            150.73982892100003,
            -33.89869111612609
          ],
          [
            150.73978589400008,
            -33.89861528112613
          ],
          [
            150.73975669900005,
            -33.898615218126125
          ],
          [
            150.73971761500002,
            -33.898668339126125
          ],
          [
            150.73964596700011,
            -33.89876376112608
          ],
          [
            150.7394900480001,
            -33.898839165126105
          ],
          [
            150.73925331700002,
            -33.89882062712611
          ],
          [
            150.73895860000005,
            -33.898673950126124
          ],
          [
            150.73882260800008,
            -33.898597926126115
          ],
          [
            150.73858790300005,
            -33.89861636512609
          ],
          [
            150.73843144600005,
            -33.8986204711261
          ],
          [
            150.73805887600008,
            -33.898947056126076
          ],
          [
            150.7380188520001,
            -33.89895520412609
          ],
          [
            150.73797768000009,
            -33.89898397012609
          ],
          [
            150.73793656300006,
            -33.89899469912609
          ],
          [
            150.73786290600003,
            -33.89903782512614
          ],
          [
            150.73782607300006,
            -33.89906209012612
          ],
          [
            150.73779678800008,
            -33.89909268412612
          ],
          [
            150.73774153400007,
            -33.899126820126135
          ],
          [
            150.7377014110001,
            -33.89916731012607
          ],
          [
            150.73766341200007,
            -33.89921591212611
          ],
          [
            150.73763315000008,
            -33.89921314312606
          ],
          [
            150.7375727960001,
            -33.89915080812607
          ],
          [
            150.73751350800012,
            -33.89909297112609
          ],
          [
            150.73744124900009,
            -33.899030619126094
          ],
          [
            150.73738738400004,
            -33.8989655931261
          ],
          [
            150.73736370100005,
            -33.89893127012613
          ],
          [
            150.73733482000011,
            -33.8988320391261
          ],
          [
            150.73731558300005,
            -33.898757162126124
          ],
          [
            150.7372962
scoringLogic.js:1540 developableArea: [
  {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            150.9416163,
            -33.88824365
          ],
          [
            150.94142515,
            -33.88875662
          ],
          [
            150.94158416,
            -33.88879424
          ],
          [
            150.94160311,
            -33.88878877
          ],
          [
            150.9418188,
            -33.88853165
          ],
          [
            150.94206536,
            -33.88833777
          ],
          [
            150.9416163,
            -33.88824365
          ]
        ]
      ]
    },
    "properties": {
      "id": "_PuEfAU-rPHMYpbTyXwGc",
      "appId": "1",
      "usage": "Developable Area",
      "public": true,
      "layerId": "Dev Area A",
      "projectId": "50986"
    }
  }
]
scoringLogic.js:1553 LMR overlap data: {hasOverlap: false, primaryOverlap: null, pixelCounts: {…}}
scoringLogic.js:1554 Developable area LMR overlap: []
scoringLogic.js:1591 Processing developable area 1...
scoringLogic.js:1599 Processing 0 precinct features for area 1
scoringLogic.js:1678 Results for all developable areas: [{…}]
scoringLogic.js:1698 
Final result: {score: 1, bestResult: {…}, lmrOverlap: {…}, hasNearbyLMR: false}
screenshot.js?t=1741318345817:3087 Starting PTAL map capture with feature: {featureId: undefined, featureType: undefined, coordinates: undefined, developableArea: 'provided'}
screenshot.js?t=1741318345817:3100 Using config: {width: 2048, height: 2048, padding: 1}
screenshot.js?t=1741318345817:140 Invalid feature geometry for bounds calculation {type: 'Polygon', coordinates: Array(1), properties: {…}, site_suitability__LGA: 'Fairfield'}
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js?t=1741318345817:140
capturePTALMap @ screenshot.js?t=1741318345817:3103
addAccessSlide @ accessSlide.js?t=1741318406437:183
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js?t=1741318345817:160 No valid coordinates found for bounds calculation
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js?t=1741318345817:160
capturePTALMap @ screenshot.js?t=1741318345817:3103
addAccessSlide @ accessSlide.js?t=1741318406437:183
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318406437:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
screenshot.js?t=1741318345817:3104 Calculated bounds: {centerX: 0, centerY: 0, size: 1000}
screenshot.js?t=1741318345817:3111 Created canvas with dimensions: {width: 2048, height: 2048}
screenshot.js?t=1741318345817:3115 Calculated Mercator bbox: -55659745.38888889,-55659745.38888889,55659745.38888889,55659745.38888889
screenshot.js?t=1741318345817:3133 Prepared aerial parameters: {SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetMap', BBOX: '-55659745.38888889,-55659745.38888889,55659745.38888889,55659745.38888889', CRS: 'EPSG:3857', …}
screenshot.js?t=1741318345817:3139 Using PTAL config: {layerId: 28919}
screenshot.js?t=1741318345817:3142 Fetching project layers from Giraffe...
screenshot.js?t=1741318345817:3144 Retrieved project layers count: 84
screenshot.js?t=1741318345817:3147 Found PTAL layer: {found: true, id: 28919, name: 'PTAL_6am-10am (AVG)', defaultGroup: 'Esri FeatureServer', vectorSource: 'present'}
screenshot.js?t=1741318345817:3172 Vector tile URL: https://layers-node-ehcce5pxxq-ts.a.run.app/featureServer/{z}/{x}/{y}/https%3A%2F%2Fportal.data.nsw.gov.au%2Farcgis%2Frest%2Fservices%2FHosted%2FPTAL_6to10amAVG%2FFeatureServer%2F0%2Fquery%3Fwhere%3D1%3D1%26geometry%3D%7Bbbox-epsg-3857%7D%26geometryType%3DesriGeometryEnvelope%26inSR%3D3857%26spatialRel%3DesriSpatialRelIntersects%26returnGeodetic%3Dfalse%26outFields%3D%2A%26returnGeometry%3Dtrue%26returnCentroid%3Dfalse%26featureEncoding%3DesriDefault%26multipatchOption%3DxyFootprint%26applyVCSProjection%3Dfalse%26returnIdsOnly%3Dfalse%26returnUniqueIdsOnly%3Dfalse%26returnCountOnly%3Dfalse%26returnExtentOnly%3Dfalse%26returnQueryGeometry%3Dfalse%26returnDistinctValues%3Dfalse%26cacheHint%3Dfalse%26returnZ%3Dfalse%26returnM%3Dfalse%26returnExceededLimitFeatures%3Dtrue%26f%3Dgeojson%26token%3DRXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
screenshot.js?t=1741318345817:3180 Decoded URL: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query?where=1=1&geometry={bbox-epsg-3857}&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&returnZ=false&returnM=false&returnExceededLimitFeatures=true&f=geojson&token=RXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
screenshot.js?t=1741318345817:3189 Using exact URL from vector tiles: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query
screenshot.js?t=1741318345817:3192 Extracted token: RXyZib9F4v...
screenshot.js?t=1741318345817:3210 Prepared PTAL parameters: {where: '1=1', geometry: '-55659745.38888889,-55659745.38888889,55659745.38888889,55659745.38888889', geometryType: 'esriGeometryEnvelope', inSR: '3857', spatialRel: 'esriSpatialRelIntersects', …}
screenshot.js?t=1741318345817:3216 Preparing to request: {aerialUrl: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…I=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300', ptalUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…eturnGeometry=true&f=geojson&token=***redacted***'}
screenshot.js?t=1741318345817:3222 Loading aerial and PTAL layers in parallel...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query/query?where=1%3D1&geometry=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=geojson&token=RXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…O-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC', method: 'GET', bodySize: 'no body', headers: undefined}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…O-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 30000ms
image.js:31 loadImage: Failed to load image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300 Event {isTrusted: true, type: 'error', target: img, currentTarget: img, eventPhase: 2, …}
(anonymous) @ rrweb-plugin-console-record.js:2447
img.onerror @ image.js:31Understand this errorAI
proxyService.js:134 Response content type: text/html
image.js:36 Using fallback transparent image
screenshot.js?t=1741318345817:3229 Loaded both layers: {baseMapLoaded: true, ptalResponseFeatures: undefined}
screenshot.js?t=1741318345817:3236 Drew base map
screenshot.js?t=1741318345817:3316 No PTAL features found in response
screenshot.js?t=1741318345817:3331 Drawing single feature
screenshot.js?t=1741318345817:3335 PTAL map capture completed successfully
scoringLogic.js:448 === PTAL Score Calculation Start ===
scoringLogic.js:449 PTAL values: (2000) ['6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '3 - Medium', '3 - Medium', '3 - Medium', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '5 - High', '2 - Low-Medium', '6 - Very High', '6 - Very High', '6 - Very High', '3 - Medium', '3 - Medium', '1 - Low', '3 - Medium', '2 - Low-Medium', '3 - Medium', '3 - Medium', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '2 - Low-Medium', '3 - Medium', '3 - Medium', '3 - Medium', '1 - Low', '1 - Low', '3 - Medium', '2 - Low-Medium', '2 - Low-Medium', '6 - Very High', '5 - High', '4 - Medium-High', '6 - Very High', '4 - Medium-High', '2 - Low-Medium', '5 - High', '5 - High', '4 - Medium-High', '6 - Very High', '1 - Low', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '6 - Very High', '6 - Very High', '3 - Medium', '5 - High', '6 - Very High', '2 - Low-Medium', '4 - Medium-High', '2 - Low-Medium', '5 - High', '5 - High', '6 - Very High', '4 - Medium-High', '2 - Low-Medium', '4 - Medium-High', '3 - Medium', '4 - Medium-High', '1 - Low', '4 - Medium-High', '6 - Very High', '6 - Very High', '1 - Low', '1 - Low', '1 - Low', '6 - Very High', '2 - Low-Medium', '2 - Low-Medium', '3 - Medium', …]
scoringLogic.js:450 Feature PTALs: []
scoringLogic.js:454 Processing PTAL for multiple features
scoringLogic.js:492 Best PTAL score across all features: 1
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-b6cb-7ef9-b373-763049b68aad', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:02 GMT+1100 (Australian Eastern Daylight Time)}
powerpoint.js?t=1741318406437:153 XHR finished loading: GET "http://localhost:5173/images/NSW-Government-official-logo.jpg".
(anonymous) @ pptxgenjs.js?v=d62f88a8:6192
(anonymous) @ pptxgenjs.js?v=d62f88a8:6112
encodeSlideMediaRels @ pptxgenjs.js?v=d62f88a8:6111
(anonymous) @ pptxgenjs.js?v=d62f88a8:7461
(anonymous) @ pptxgenjs.js?v=d62f88a8:7460
step @ pptxgenjs.js?v=d62f88a8:2496
(anonymous) @ pptxgenjs.js?v=d62f88a8:2448
(anonymous) @ pptxgenjs.js?v=d62f88a8:2435
__awaiter @ pptxgenjs.js?v=d62f88a8:2417
PptxGenJS2.exportPresentation @ pptxgenjs.js?v=d62f88a8:7451
(anonymous) @ pptxgenjs.js?v=d62f88a8:7852
step @ pptxgenjs.js?v=d62f88a8:2496
(anonymous) @ pptxgenjs.js?v=d62f88a8:2448
(anonymous) @ pptxgenjs.js?v=d62f88a8:2435
__awaiter @ pptxgenjs.js?v=d62f88a8:2417
PptxGenJS2.writeFile @ pptxgenjs.js?v=d62f88a8:7840
generateReport @ powerpoint.js?t=1741318406437:153
await in generateReport
generatePropertyReport @ ReportGenerator.jsx:1002
99rrweb-plugin-console-record.js:2447 error parsing message SyntaxError: Unexpected token 's', "setImmedia"... is not valid JSON
    at JSON.parse (<anonymous>)
    at @gi-nx_iframe-sdk.js?v=d62f88a8:704:25
tokenUtils.js:59 Getting user name from GiraffeSdk state: {id: 2907, name: 'James Strutt', email: 'james.strutt@dpie.nsw.gov.au', hubspot_props: {…}, preferences: {…}, …}
tokenUtils.js:65 Selected user name from state: James Strutt
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-be9d-7f95-a9bc-a9d6ff8596c3', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:04 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-d132-70d7-a4d4-5531ed8e7398', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:08 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-ddff-76df-87a6-4b219ca0e5ce', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:12 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-e849-7a77-8443-6f21ce362cde', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:14 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eab-f527-794e-8eb9-e0bca7f2b21b', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:35:18 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eac-cc49-7d34-8c1d-7299a94a468f', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:36:13 GMT+1100 (Australian Eastern Daylight Time)}
screenshot.js?t=1741318575685:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
FeasibilityManager.jsx:339 Modal not open or no feature selected, skipping fetch
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js?t=1741318575685:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js?t=1741318575685:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318575685:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js?t=1741318575685:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js?t=1741318575685:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318575685:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
screenshot.js?t=1741318575950:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js?t=1741318575950:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js?t=1741318575950:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318575950:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js?t=1741318575950:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js?t=1741318575950:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318575950:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318575950:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318575950:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js?t=1741318575950:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js?t=1741318575950:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318575950:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js?t=1741318575950:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js?t=1741318575950:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318575950:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318575685:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318575685:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js?t=1741318575685:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js?t=1741318575685:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318575685:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js?t=1741318575685:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js?t=1741318575685:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318575685:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318575950:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318575950:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318575950:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318575950:327 Calculating bounds...
contextScreenshot.js?t=1741318575950:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318575950:334 Creating canvas...
contextScreenshot.js?t=1741318575950:340 Loading aerial base layer...
contextScreenshot.js?t=1741318575950:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318575685:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318575685:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318575685:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318575685:327 Calculating bounds...
contextScreenshot.js?t=1741318575685:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318575685:334 Creating canvas...
contextScreenshot.js?t=1741318575685:340 Loading aerial base layer...
contextScreenshot.js?t=1741318575685:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js?t=1741318575950:344 Base map image loaded successfully
contextScreenshot.js?t=1741318575950:356 Starting GPR layer capture...
contextScreenshot.js?t=1741318575950:365 Generating fresh GPR token...
contextScreenshot.js?t=1741318575950:20 Requesting GPR token...
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js?t=1741318575685:344 Base map image loaded successfully
contextScreenshot.js?t=1741318575685:356 Starting GPR layer capture...
contextScreenshot.js?t=1741318575685:365 Generating fresh GPR token...
contextScreenshot.js?t=1741318575685:20 Requesting GPR token...
contextScreenshot.js?t=1741318575950:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
contextScreenshot.js?t=1741318575950:37 Successfully generated token
contextScreenshot.js?t=1741318575950:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
contextScreenshot.js?t=1741318575950:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
contextScreenshot.js?t=1741318575950:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318575950:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318575950:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318575950:393 Getting GPR image...
contextScreenshot.js?t=1741318575950:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.&f=image&bboxSR=4283&imageSR=3857
contextScreenshot.js?t=1741318575685:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
contextScreenshot.js?t=1741318575685:37 Successfully generated token
contextScreenshot.js?t=1741318575685:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
contextScreenshot.js?t=1741318575685:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
contextScreenshot.js?t=1741318575685:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318575685:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318575685:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318575685:393 Getting GPR image...
contextScreenshot.js?t=1741318575685:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/266d15ae-aa24-453d-90d5-b5f0f217e0f9
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/266d15ae-aa24-453d-90d5-b5f0f217e0f9
contextScreenshot.js?t=1741318575950:412 GPR image received
contextScreenshot.js?t=1741318575950:414 GPR layer drawn
contextScreenshot.js?t=1741318575950:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
image.js:2 loadImage: Loading image from blob:http://localhost:5173/889729e1-ff0f-4aad-9fbd-6f51f0389d72
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/889729e1-ff0f-4aad-9fbd-6f51f0389d72
contextScreenshot.js?t=1741318575685:412 GPR image received
contextScreenshot.js?t=1741318575685:414 GPR layer drawn
contextScreenshot.js?t=1741318575685:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTls23h_AxkM9rc5V-fbHTZQ.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318575950:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318575950:445 Found 33 GPR features
contextScreenshot.js?t=1741318575950:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318575950:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318575950:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318575950:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318575950:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318575950:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318575950:180 Drawing developable area 0
contextScreenshot.js?t=1741318575950:488 Converting canvas to image...
contextScreenshot.js?t=1741318575950:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318575950:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318575685:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318575685:445 Found 33 GPR features
contextScreenshot.js?t=1741318575685:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318575685:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318575685:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318575685:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318575685:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318575685:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318575685:180 Drawing developable area 0
contextScreenshot.js?t=1741318575685:488 Converting canvas to image...
contextScreenshot.js?t=1741318575685:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318575685:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event sent",{"event":"pusher:ping","data":{}}]
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event recd",{"event":"pusher:pong","data":{}}]
screenshot.js?t=1741318693417:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js?t=1741318693417:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js?t=1741318693417:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318693417:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js?t=1741318693417:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js?t=1741318693417:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318693417:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318693417:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318693417:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js?t=1741318693417:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js?t=1741318693417:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318693417:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js?t=1741318693417:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js?t=1741318693417:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318693417:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318697187:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
client:174 SyntaxError: The requested module '/src/components/pptxApp/utils/map/services/screenshot.js?t=1741318697187' does not provide an export named 'captureContaminationMap' (at contaminationSlide.js?t=1741318697187:3:10)
(anonymous) @ rrweb-plugin-console-record.js:2447
warnFailedUpdate @ client:174
fetchUpdate @ client:213
await in fetchUpdate
queueUpdate @ client:186
(anonymous) @ client:638
handleMessage @ client:636
(anonymous) @ client:546Understand this errorAI
client:176 [hmr] Failed to reload /src/components/pptxApp/ReportGenerator.jsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
(anonymous) @ rrweb-plugin-console-record.js:2447
warnFailedUpdate @ client:176
fetchUpdate @ client:213
await in fetchUpdate
queueUpdate @ client:186
(anonymous) @ client:638
handleMessage @ client:636
(anonymous) @ client:546Understand this errorAI
screenshot.js?t=1741318697952:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js?t=1741318697952:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js?t=1741318697952:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318697952:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js?t=1741318697952:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js?t=1741318697952:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318697952:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318697952:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318697952:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js?t=1741318697952:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js?t=1741318697952:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318697952:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js?t=1741318697952:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js?t=1741318697952:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318697952:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318697952:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318697952:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318697952:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318697952:327 Calculating bounds...
contextScreenshot.js?t=1741318697952:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318697952:334 Creating canvas...
contextScreenshot.js?t=1741318697952:340 Loading aerial base layer...
contextScreenshot.js?t=1741318697952:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318693417:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318693417:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318693417:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318693417:327 Calculating bounds...
contextScreenshot.js?t=1741318693417:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318693417:334 Creating canvas...
contextScreenshot.js?t=1741318693417:340 Loading aerial base layer...
contextScreenshot.js?t=1741318693417:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
 Base map image loaded successfully
 Starting GPR layer capture...
 Generating fresh GPR token...
 Requesting GPR token...
 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
 Base map image loaded successfully
 Starting GPR layer capture...
 Generating fresh GPR token...
contextScreenshot.js?t=1741318697952:20 Requesting GPR token...
contextScreenshot.js?t=1741318693417:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.
contextScreenshot.js?t=1741318693417:37 Successfully generated token
contextScreenshot.js?t=1741318693417:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.
contextScreenshot.js?t=1741318693417:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.
contextScreenshot.js?t=1741318693417:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318693417:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318693417:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318693417:393 Getting GPR image...
contextScreenshot.js?t=1741318693417:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.&f=image&bboxSR=4283&imageSR=3857
contextScreenshot.js?t=1741318697952:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.
contextScreenshot.js?t=1741318697952:37 Successfully generated token
contextScreenshot.js?t=1741318697952:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.
contextScreenshot.js?t=1741318697952:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.
contextScreenshot.js?t=1741318697952:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318697952:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318697952:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318697952:393 Getting GPR image...
contextScreenshot.js?t=1741318697952:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/a1ac3508-7e46-4068-80bb-ad2d978e38c3
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/a1ac3508-7e46-4068-80bb-ad2d978e38c3
contextScreenshot.js?t=1741318693417:412 GPR image received
contextScreenshot.js?t=1741318693417:414 GPR layer drawn
contextScreenshot.js?t=1741318693417:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTvPBSSVhvF3DAuoZeucHIzk.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
image.js:2 loadImage: Loading image from blob:http://localhost:5173/c7973f16-1a55-4c39-8dd6-e86a73b8e9ad
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/c7973f16-1a55-4c39-8dd6-e86a73b8e9ad
contextScreenshot.js?t=1741318697952:412 GPR image received
contextScreenshot.js?t=1741318697952:414 GPR layer drawn
contextScreenshot.js?t=1741318697952:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTofmsP7dvMo7v6a6sh04uuQ.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318693417:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318693417:445 Found 33 GPR features
contextScreenshot.js?t=1741318693417:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318693417:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318693417:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318693417:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318693417:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318693417:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318693417:180 Drawing developable area 0
contextScreenshot.js?t=1741318693417:488 Converting canvas to image...
contextScreenshot.js?t=1741318693417:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318693417:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318697952:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318697952:445 Found 33 GPR features
contextScreenshot.js?t=1741318697952:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318697952:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318697952:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318697952:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318697952:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318697952:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318697952:180 Drawing developable area 0
contextScreenshot.js?t=1741318697952:488 Converting canvas to image...
contextScreenshot.js?t=1741318697952:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318697952:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
screenshot.js?t=1741318717141:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js?t=1741318717141:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js?t=1741318717141:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318717141:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js?t=1741318717141:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js?t=1741318717141:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318717141:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318717141:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318717141:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js?t=1741318717141:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js?t=1741318717141:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js?t=1741318717141:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js?t=1741318717141:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js?t=1741318717141:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js?t=1741318717141:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:53 
            
            
           GET http://localhost:5173/src/components/pptxApp/utils/map/services/screenshot.js?t=1741318720847 net::ERR_ABORTED 500 (Internal Server Error)Understand this errorAI
client:176 [hmr] Failed to reload /src/components/pptxApp/ReportGenerator.jsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
(anonymous) @ rrweb-plugin-console-record.js:2447
warnFailedUpdate @ client:176
fetchUpdate @ client:213
await in fetchUpdate
queueUpdate @ client:186
(anonymous) @ client:638
handleMessage @ client:636
(anonymous) @ client:546Understand this errorAI
client:176 [hmr] Failed to reload /src/components/pptxApp/PlanningMapView.jsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
(anonymous) @ rrweb-plugin-console-record.js:2447
warnFailedUpdate @ client:176
fetchUpdate @ client:213
await in fetchUpdate
queueUpdate @ client:186
(anonymous) @ client:638
handleMessage @ client:636
(anonymous) @ client:546Understand this errorAI
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js?t=1741318717141:55 captureMapScreenshot: Main image captured
screenshot.js?t=1741318717141:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318717141:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318717141:327 Calculating bounds...
contextScreenshot.js?t=1741318717141:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318717141:334 Creating canvas...
contextScreenshot.js?t=1741318717141:340 Loading aerial base layer...
contextScreenshot.js?t=1741318717141:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eaf-1a23-74b0-8dda-62b94ff42c67', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:38:44 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js?t=1741318717141:344 Base map image loaded successfully
contextScreenshot.js?t=1741318717141:356 Starting GPR layer capture...
contextScreenshot.js?t=1741318717141:365 Generating fresh GPR token...
contextScreenshot.js?t=1741318717141:20 Requesting GPR token...
contextScreenshot.js?t=1741318717141:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.
contextScreenshot.js?t=1741318717141:37 Successfully generated token
contextScreenshot.js?t=1741318717141:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.
contextScreenshot.js?t=1741318717141:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.
contextScreenshot.js?t=1741318717141:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318717141:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318717141:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318717141:393 Getting GPR image...
contextScreenshot.js?t=1741318717141:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/0f3a62f2-1752-4026-b2cf-918cbea9daad
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/0f3a62f2-1752-4026-b2cf-918cbea9daad
contextScreenshot.js?t=1741318717141:412 GPR image received
contextScreenshot.js?t=1741318717141:414 GPR layer drawn
contextScreenshot.js?t=1741318717141:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTgFT104N-za8AoqDqh1NPCI.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318717141:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318717141:445 Found 33 GPR features
contextScreenshot.js?t=1741318717141:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318717141:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318717141:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318717141:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318717141:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318717141:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318717141:180 Drawing developable area 0
contextScreenshot.js?t=1741318717141:488 Converting canvas to image...
contextScreenshot.js?t=1741318717141:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318717141:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
screenshot.js:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eaf-356e-7a7d-aadc-600ba6a32461', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:38:51 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318728326:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318728326:327 Calculating bounds...
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
contextScreenshot.js?t=1741318728326:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318728326:334 Creating canvas...
contextScreenshot.js?t=1741318728326:340 Loading aerial base layer...
contextScreenshot.js?t=1741318728326:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js?t=1741318728326:344 Base map image loaded successfully
contextScreenshot.js?t=1741318728326:356 Starting GPR layer capture...
contextScreenshot.js?t=1741318728326:365 Generating fresh GPR token...
contextScreenshot.js?t=1741318728326:20 Requesting GPR token...
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
contextScreenshot.js?t=1741318728326:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.
contextScreenshot.js?t=1741318728326:37 Successfully generated token
contextScreenshot.js?t=1741318728326:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.
contextScreenshot.js?t=1741318728326:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.
contextScreenshot.js?t=1741318728326:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318728326:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318728326:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318728326:393 Getting GPR image...
contextScreenshot.js?t=1741318728326:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.&f=image&bboxSR=4283&imageSR=3857
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:2 loadImage: Loading image from blob:http://localhost:5173/61ae710f-039e-43fd-9068-fa1bfc3629ad
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/61ae710f-039e-43fd-9068-fa1bfc3629ad
contextScreenshot.js?t=1741318728326:412 GPR image received
contextScreenshot.js?t=1741318728326:414 GPR layer drawn
contextScreenshot.js?t=1741318728326:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lToPA9e9cISDFNJQj4y9TDng.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318728326:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318728326:445 Found 33 GPR features
contextScreenshot.js?t=1741318728326:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318728326:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318728326:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318728326:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318728326:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318728326:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318728326:180 Drawing developable area 0
contextScreenshot.js?t=1741318728326:488 Converting canvas to image...
contextScreenshot.js?t=1741318728326:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318728326:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event sent",{"event":"pusher:ping","data":{}}]
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event recd",{"event":"pusher:pong","data":{}}]
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js?t=1741318736601:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js?t=1741318736601:327 Calculating bounds...
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
contextScreenshot.js?t=1741318736601:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js?t=1741318736601:334 Creating canvas...
contextScreenshot.js?t=1741318736601:340 Loading aerial base layer...
contextScreenshot.js?t=1741318736601:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:17 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js?t=1741318736601:344 Base map image loaded successfully
contextScreenshot.js?t=1741318736601:356 Starting GPR layer capture...
contextScreenshot.js?t=1741318736601:365 Generating fresh GPR token...
contextScreenshot.js?t=1741318736601:20 Requesting GPR token...
contextScreenshot.js?t=1741318736601:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.
contextScreenshot.js?t=1741318736601:37 Successfully generated token
contextScreenshot.js?t=1741318736601:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.
contextScreenshot.js?t=1741318736601:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.
contextScreenshot.js?t=1741318736601:371 Calculating Mercator parameters...
contextScreenshot.js?t=1741318736601:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js?t=1741318736601:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js?t=1741318736601:393 Getting GPR image...
contextScreenshot.js?t=1741318736601:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/1cf45086-090e-4fba-aa15-e1acb95f8adc
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/1cf45086-090e-4fba-aa15-e1acb95f8adc
contextScreenshot.js?t=1741318736601:412 GPR image received
contextScreenshot.js?t=1741318736601:414 GPR layer drawn
contextScreenshot.js?t=1741318736601:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTord_nGBaofNdjuViD77B7c.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js?t=1741318736601:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js?t=1741318736601:445 Found 33 GPR features
contextScreenshot.js?t=1741318736601:470 Drawing feature boundaries...
contextScreenshot.js?t=1741318736601:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js?t=1741318736601:119 Drawing single GeoJSON feature boundary
contextScreenshot.js?t=1741318736601:479 Drawing developable area boundaries...
contextScreenshot.js?t=1741318736601:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js?t=1741318736601:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js?t=1741318736601:180 Drawing developable area 0
contextScreenshot.js?t=1741318736601:488 Converting canvas to image...
contextScreenshot.js?t=1741318736601:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js?t=1741318736601:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js:327 Calculating bounds...
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
contextScreenshot.js:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js:334 Creating canvas...
contextScreenshot.js:340 Loading aerial base layer...
contextScreenshot.js:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js:344 Base map image loaded successfully
contextScreenshot.js:356 Starting GPR layer capture...
contextScreenshot.js:365 Generating fresh GPR token...
contextScreenshot.js:20 Requesting GPR token...
contextScreenshot.js:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.
contextScreenshot.js:37 Successfully generated token
contextScreenshot.js:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.
contextScreenshot.js:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.
contextScreenshot.js:371 Calculating Mercator parameters...
contextScreenshot.js:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js:393 Getting GPR image...
contextScreenshot.js:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/aa1f450d-58ec-4ad4-aaf5-af165deda3ca
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/aa1f450d-58ec-4ad4-aaf5-af165deda3ca
contextScreenshot.js:412 GPR image received
contextScreenshot.js:414 GPR layer drawn
contextScreenshot.js:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTlYEQgb6Od5qV0PgmN3iXkc.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js:445 Found 33 GPR features
contextScreenshot.js:470 Drawing feature boundaries...
contextScreenshot.js:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js:119 Drawing single GeoJSON feature boundary
contextScreenshot.js:479 Drawing developable area boundaries...
contextScreenshot.js:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js:180 Drawing developable area 0
contextScreenshot.js:488 Converting canvas to image...
contextScreenshot.js:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-0ed1-79b0-8711-f0802d36010d', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:46 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-0ed2-7fef-b3ea-f1f7ee9d4e3f', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:46 GMT+1100 (Australian Eastern Daylight Time)}
ReportGenerator.jsx:484 Attempting to fetch sales data for: {suburb: 'CANLEY VALE', rawSuburb: 'Canley Vale', fullProperties: {…}}
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
ReportGenerator.jsx:498 CSV parsing complete for report generation: {totalRows: 126252, headers: Array(10)}
ReportGenerator.jsx:525 Processed sales data for report: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE'}
ReportGenerator.jsx:546 Final sales data check before report generation: {hasData: true, length: 87, sample: Array(3), suburb: 'Canley Vale'}
screenshot.js:1879 Starting roads capture... {featureType: 'Feature', hasMultipleFeatures: false, developableAreaFeatures: 1}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:1896 Fetching road features...
screenshot.js:1809 Fetching road features with params: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901}
screenshot.js:1814 Query bbox (expanded): 150.94065811079997,-33.889379454200004,150.9428461092,-33.8871914558
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/0/query?f=json&geometry=150.94065811079997%2C-33.889379454200004%2C150.9428461092%2C-33.8871914558&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=ROADNAMEST%2CFUNCTION%2CLANECOUNT&returnGeometry=true&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…e&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…e&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 120000ms
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-16a9-7063-b98e-6708d58b6f07', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:48 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js:327 Calculating bounds...
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
contextScreenshot.js:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js:334 Creating canvas...
contextScreenshot.js:340 Loading aerial base layer...
contextScreenshot.js:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-2086-7024-aacb-e2e3c1e61114', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:51 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js:344 Base map image loaded successfully
contextScreenshot.js:356 Starting GPR layer capture...
contextScreenshot.js:365 Generating fresh GPR token...
contextScreenshot.js:20 Requesting GPR token...
contextScreenshot.js:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.
contextScreenshot.js:37 Successfully generated token
contextScreenshot.js:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.
contextScreenshot.js:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.
contextScreenshot.js:371 Calculating Mercator parameters...
contextScreenshot.js:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js:393 Getting GPR image...
contextScreenshot.js:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/92d77aee-367d-4c3e-815a-357e069e9793
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/92d77aee-367d-4c3e-815a-357e069e9793
contextScreenshot.js:412 GPR image received
contextScreenshot.js:414 GPR layer drawn
contextScreenshot.js:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTqqprsYBWT5BYUibJJBYm80.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-2a30-76bf-845a-2a4e54115d1b', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:53 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js:445 Found 33 GPR features
contextScreenshot.js:470 Drawing feature boundaries...
contextScreenshot.js:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js:119 Drawing single GeoJSON feature boundary
contextScreenshot.js:479 Drawing developable area boundaries...
contextScreenshot.js:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js:180 Drawing developable area 0
contextScreenshot.js:488 Converting canvas to image...
contextScreenshot.js:490 Canvas conversion complete: {imageLength: 11712162, startsWithData: true, imageType: 'string'}
contextScreenshot.js:496 Returning result with {hasImage: true, featureCount: 33, imageLength: 11712162}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-3202-715b-84b9-9f44d8dbcd4b', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:55 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-39da-74aa-be17-5ea063fdaf17', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:39:57 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-458a-7669-98e1-96e9e8eb4e57', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:00 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-4d63-77d4-ae51-a101a6811a94', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:02 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-591a-7313-9866-f3a86695c922', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:05 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-64d3-7d96-a2da-a7778d3ef4c9', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:08 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-708a-740c-996f-929cc3f0f1df', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:11 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-7c39-7e9e-8689-fa7bf7f0c095', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:14 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-8412-70c4-8ca1-f6b841e91125', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:16 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-8fca-7b2d-87b4-f278d95db019', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:19 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-9b79-7a7c-9441-e98aca6df518', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:22 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-a353-789c-8958-dbe5a2d1ba53', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:24 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: application/json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
screenshot.js:1832 Road features response: {displayFieldName: 'roadnameba', fieldAliases: {…}, geometryType: 'esriGeometryPolyline', spatialReference: {…}, fields: Array(3), …}
screenshot.js:1835 Found 22 road features
screenshot.js:1867 Converted and deduplicated features: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
screenshot.js:1898 Retrieved road features: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
screenshot.js:1926 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-af0b-7494-9c63-07a09719ac95', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:27 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:1955 Loading roads layer...
screenshot.js:1979 Requesting roads layer through proxy... https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-bac3-7651-85a5-7a1e87da3c50', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:30 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-c67a-7757-8823-2f4839d48d51', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:33 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-d232-7b19-8b95-1d8a179bdd88', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:36 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-ddec-72d9-9ac0-f39c2520b4bb', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:39 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-e9a3-718e-9d9a-68cb394979da', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:42 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb0-f55b-7972-aac0-394dd9413bda', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:45 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-0112-7a3e-8f77-9c3dd6a2fe32', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:48 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-0cca-7edc-961a-5022e3e4b388', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:51 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-1882-7d40-aa17-7455bfc3598f', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:54 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-243b-73ca-9890-3e2af9ef7ca7', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:40:57 GMT+1100 (Australian Eastern Daylight Time)}
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event sent",{"event":"pusher:ping","data":{}}]
SpacesTopBar-DorZiJxB.js:135 Pusher :  : ["Event recd",{"event":"pusher:pong","data":{}}]
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-2ff4-77d9-9f83-c3fafd116ed1', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:00 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: image/png
screenshot.js:1984 Loading roads image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/4825737d-82ce-4936-955a-cd08e9fab35a
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/4825737d-82ce-4936-955a-cd08e9fab35a
screenshot.js:1986 Roads layer loaded successfully
screenshot.js:2001 Loading road labels layer...
screenshot.js:2011 Labels bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js:2026 Requesting road labels through proxy... https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: sixmaps/LPI_RasterLabels_1
proxyService.js:73 Proxy request details: {url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-3baa-71f5-9386-a34fc643bf1f', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:03 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: image/png
screenshot.js:2033 Loading road labels from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/bd9f3c40-c325-443f-9758-f8e641f3b0e6
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/bd9f3c40-c325-443f-9758-f8e641f3b0e6
screenshot.js:2035 Road labels loaded successfully
screenshot.js:2043 Drawing developable area boundaries...
screenshot.js:2060 Drawing single feature
screenshot.js:2790 Starting UDP precinct map capture...
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:2815 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16801816.61252013%2C-4014753.709811162%2C16803701.356139317%2C-4012868.9661919754&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-4762-7e6d-a05a-5c2a0eafff2b', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:06 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16801816.61252013%2C-4014753.709811162%2C16803701.356139317%2C-4012868.9661919754&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:2844 Loading LMR layers...
screenshot.js:2867 Requesting LMR layers through proxy... https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=150.93328664%2C-33.89675092499999%2C150.95021757999996%2C-33.87981998500001&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=150.93328664%2C-33.89675092499999%2C150.95021757999996%2C-33.87981998500001&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:73 Proxy request details: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
screenshot.js:2871 Loading LMR image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/fdaf6d53-4000-4bc1-8d2c-da3aa603a952
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/fdaf6d53-4000-4bc1-8d2c-da3aa603a952
screenshot.js:2873 LMR layers loaded successfully
screenshot.js:2563 Checking LMR overlap for feature using direct query...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16801816.61252013%2C-4014753.709811162%2C16803701.356139317%2C-4012868.9661919754&bboxSR=3857&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:73 Proxy request details: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
image.js:2 loadImage: Loading image from blob:http://localhost:5173/4de7684f-cec3-462a-bc74-4d52cae220a3
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/4de7684f-cec3-462a-bc74-4d52cae220a3
screenshot.js:2756 LMR overlap check results: {Indicative LMR Housing Area: true, TOD Accelerated Rezoning Area: false, TOD Area: false}
screenshot.js:2757 LMR pixel counts: {Indicative LMR Housing Area: 2097, TOD Accelerated Rezoning Area: 0, TOD Area: 0}
screenshot.js:2881 LMR overlap results: {hasOverlap: true, overlaps: {…}, primaryOverlap: 'Indicative LMR Housing Area', pixelCounts: {…}}
screenshot.js:2891 Checking if developable areas are within LMR/TOD areas...
screenshot.js:2563 Checking LMR overlap for feature using direct query...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=16801816.61252013%2C-4014753.709811162%2C16803701.356139317%2C-4012868.9661919754&bboxSR=3857&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:73 Proxy request details: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
image.js:2 loadImage: Loading image from blob:http://localhost:5173/f0aa4022-fa9b-452c-a79d-a4f7fbcb7b90
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/f0aa4022-fa9b-452c-a79d-a4f7fbcb7b90
screenshot.js:2756 LMR overlap check results: {Indicative LMR Housing Area: true, TOD Accelerated Rezoning Area: false, TOD Area: false}
screenshot.js:2757 LMR pixel counts: {Indicative LMR Housing Area: 585, TOD Accelerated Rezoning Area: 0, TOD Area: 0}
screenshot.js:2901 Developable area 1 LMR overlap: {hasOverlap: true, overlaps: {…}, primaryOverlap: 'Indicative LMR Housing Area', pixelCounts: {…}}
screenshot.js:2931 Loading UDP precincts...
screenshot.js:2936 Drawing 170 UDP precinct features...
screenshot.js:2949 Drawing UDP precinct feature 1...
screenshot.js:2949 Drawing UDP precinct feature 2...
screenshot.js:2949 Drawing UDP precinct feature 3...
screenshot.js:2949 Drawing UDP precinct feature 4...
screenshot.js:2949 Drawing UDP precinct feature 5...
screenshot.js:2949 Drawing UDP precinct feature 6...
screenshot.js:2949 Drawing UDP precinct feature 7...
screenshot.js:2949 Drawing UDP precinct feature 8...
screenshot.js:2949 Drawing UDP precinct feature 9...
screenshot.js:2949 Drawing UDP precinct feature 10...
screenshot.js:2949 Drawing UDP precinct feature 11...
screenshot.js:2949 Drawing UDP precinct feature 12...
screenshot.js:2949 Drawing UDP precinct feature 13...
screenshot.js:2949 Drawing UDP precinct feature 14...
screenshot.js:2949 Drawing UDP precinct feature 15...
screenshot.js:2949 Drawing UDP precinct feature 16...
screenshot.js:2949 Drawing UDP precinct feature 17...
screenshot.js:2949 Drawing UDP precinct feature 18...
screenshot.js:2949 Drawing UDP precinct feature 19...
screenshot.js:2949 Drawing UDP precinct feature 20...
screenshot.js:2949 Drawing UDP precinct feature 21...
screenshot.js:2949 Drawing UDP precinct feature 22...
screenshot.js:2949 Drawing UDP precinct feature 23...
screenshot.js:2949 Drawing UDP precinct feature 24...
screenshot.js:2949 Drawing UDP precinct feature 25...
screenshot.js:2949 Drawing UDP precinct feature 26...
screenshot.js:2949 Drawing UDP precinct feature 27...
screenshot.js:2949 Drawing UDP precinct feature 28...
screenshot.js:2949 Drawing UDP precinct feature 29...
screenshot.js:2949 Drawing UDP precinct feature 30...
screenshot.js:2949 Drawing UDP precinct feature 31...
screenshot.js:2949 Drawing UDP precinct feature 32...
screenshot.js:2949 Drawing UDP precinct feature 33...
screenshot.js:2949 Drawing UDP precinct feature 34...
screenshot.js:2949 Drawing UDP precinct feature 35...
screenshot.js:2949 Drawing UDP precinct feature 36...
screenshot.js:2949 Drawing UDP precinct feature 37...
screenshot.js:2949 Drawing UDP precinct feature 38...
screenshot.js:2949 Drawing UDP precinct feature 39...
screenshot.js:2949 Drawing UDP precinct feature 40...
screenshot.js:2949 Drawing UDP precinct feature 41...
screenshot.js:2949 Drawing UDP precinct feature 42...
screenshot.js:2949 Drawing UDP precinct feature 43...
screenshot.js:2949 Drawing UDP precinct feature 44...
screenshot.js:2949 Drawing UDP precinct feature 45...
screenshot.js:2949 Drawing UDP precinct feature 46...
screenshot.js:2949 Drawing UDP precinct feature 47...
screenshot.js:2949 Drawing UDP precinct feature 48...
screenshot.js:2949 Drawing UDP precinct feature 49...
screenshot.js:2949 Drawing UDP precinct feature 50...
screenshot.js:2949 Drawing UDP precinct feature 51...
screenshot.js:2949 Drawing UDP precinct feature 52...
screenshot.js:2949 Drawing UDP precinct feature 53...
screenshot.js:2949 Drawing UDP precinct feature 54...
screenshot.js:2949 Drawing UDP precinct feature 55...
screenshot.js:2949 Drawing UDP precinct feature 56...
screenshot.js:2949 Drawing UDP precinct feature 57...
screenshot.js:2949 Drawing UDP precinct feature 58...
screenshot.js:2949 Drawing UDP precinct feature 59...
screenshot.js:2949 Drawing UDP precinct feature 60...
screenshot.js:2949 Drawing UDP precinct feature 61...
screenshot.js:2949 Drawing UDP precinct feature 62...
screenshot.js:2949 Drawing UDP precinct feature 63...
screenshot.js:2949 Drawing UDP precinct feature 64...
screenshot.js:2949 Drawing UDP precinct feature 65...
screenshot.js:2949 Drawing UDP precinct feature 66...
screenshot.js:2949 Drawing UDP precinct feature 67...
screenshot.js:2949 Drawing UDP precinct feature 68...
screenshot.js:2949 Drawing UDP precinct feature 69...
screenshot.js:2949 Drawing UDP precinct feature 70...
screenshot.js:2949 Drawing UDP precinct feature 71...
screenshot.js:2949 Drawing UDP precinct feature 72...
screenshot.js:2949 Drawing UDP precinct feature 73...
screenshot.js:2949 Drawing UDP precinct feature 74...
screenshot.js:2949 Drawing UDP precinct feature 75...
screenshot.js:2949 Drawing UDP precinct feature 76...
screenshot.js:2949 Drawing UDP precinct feature 77...
screenshot.js:2949 Drawing UDP precinct feature 78...
screenshot.js:2949 Drawing UDP precinct feature 79...
screenshot.js:2949 Drawing UDP precinct feature 80...
screenshot.js:2949 Drawing UDP precinct feature 81...
screenshot.js:2949 Drawing UDP precinct feature 82...
screenshot.js:2949 Drawing UDP precinct feature 83...
screenshot.js:2949 Drawing UDP precinct feature 84...
screenshot.js:2949 Drawing UDP precinct feature 85...
screenshot.js:2949 Drawing UDP precinct feature 86...
screenshot.js:2949 Drawing UDP precinct feature 87...
screenshot.js:2949 Drawing UDP precinct feature 88...
screenshot.js:2949 Drawing UDP precinct feature 89...
screenshot.js:2949 Drawing UDP precinct feature 90...
screenshot.js:2949 Drawing UDP precinct feature 91...
screenshot.js:2949 Drawing UDP precinct feature 92...
screenshot.js:2949 Drawing UDP precinct feature 93...
screenshot.js:2949 Drawing UDP precinct feature 94...
screenshot.js:2949 Drawing UDP precinct feature 95...
screenshot.js:2949 Drawing UDP precinct feature 96...
screenshot.js:2949 Drawing UDP precinct feature 97...
screenshot.js:2949 Drawing UDP precinct feature 98...
screenshot.js:2949 Drawing UDP precinct feature 99...
screenshot.js:2949 Drawing UDP precinct feature 100...
screenshot.js:2949 Drawing UDP precinct feature 101...
screenshot.js:2949 Drawing UDP precinct feature 102...
screenshot.js:2949 Drawing UDP precinct feature 103...
screenshot.js:2949 Drawing UDP precinct feature 104...
screenshot.js:2949 Drawing UDP precinct feature 105...
screenshot.js:2949 Drawing UDP precinct feature 106...
screenshot.js:2949 Drawing UDP precinct feature 107...
screenshot.js:2949 Drawing UDP precinct feature 108...
screenshot.js:2949 Drawing UDP precinct feature 109...
screenshot.js:2949 Drawing UDP precinct feature 110...
screenshot.js:2949 Drawing UDP precinct feature 111...
screenshot.js:2949 Drawing UDP precinct feature 112...
screenshot.js:2949 Drawing UDP precinct feature 113...
screenshot.js:2949 Drawing UDP precinct feature 114...
screenshot.js:2949 Drawing UDP precinct feature 115...
screenshot.js:2949 Drawing UDP precinct feature 116...
screenshot.js:2949 Drawing UDP precinct feature 117...
screenshot.js:2949 Drawing UDP precinct feature 118...
screenshot.js:2949 Drawing UDP precinct feature 119...
screenshot.js:2949 Drawing UDP precinct feature 120...
screenshot.js:2949 Drawing UDP precinct feature 121...
screenshot.js:2949 Drawing UDP precinct feature 122...
screenshot.js:2949 Drawing UDP precinct feature 123...
screenshot.js:2949 Drawing UDP precinct feature 124...
screenshot.js:2949 Drawing UDP precinct feature 125...
screenshot.js:2949 Drawing UDP precinct feature 126...
screenshot.js:2949 Drawing UDP precinct feature 127...
screenshot.js:2949 Drawing UDP precinct feature 128...
screenshot.js:2949 Drawing UDP precinct feature 129...
screenshot.js:2949 Drawing UDP precinct feature 130...
screenshot.js:2949 Drawing UDP precinct feature 131...
screenshot.js:2949 Drawing UDP precinct feature 132...
screenshot.js:2949 Drawing UDP precinct feature 133...
screenshot.js:2949 Drawing UDP precinct feature 134...
screenshot.js:2949 Drawing UDP precinct feature 135...
screenshot.js:2949 Drawing UDP precinct feature 136...
screenshot.js:2949 Drawing UDP precinct feature 137...
screenshot.js:2949 Drawing UDP precinct feature 138...
screenshot.js:2949 Drawing UDP precinct feature 139...
screenshot.js:2949 Drawing UDP precinct feature 140...
screenshot.js:2949 Drawing UDP precinct feature 141...
screenshot.js:2949 Drawing UDP precinct feature 142...
screenshot.js:2949 Drawing UDP precinct feature 143...
screenshot.js:2949 Drawing UDP precinct feature 144...
screenshot.js:2949 Drawing UDP precinct feature 145...
screenshot.js:2949 Drawing UDP precinct feature 146...
screenshot.js:2949 Drawing UDP precinct feature 147...
screenshot.js:2949 Drawing UDP precinct feature 148...
screenshot.js:2949 Drawing UDP precinct feature 149...
screenshot.js:2949 Drawing UDP precinct feature 150...
screenshot.js:2949 Drawing UDP precinct feature 151...
screenshot.js:2949 Drawing UDP precinct feature 152...
screenshot.js:2949 Drawing UDP precinct feature 153...
screenshot.js:2949 Drawing UDP precinct feature 154...
screenshot.js:2949 Drawing UDP precinct feature 155...
screenshot.js:2949 Drawing UDP precinct feature 156...
screenshot.js:2949 Drawing UDP precinct feature 157...
screenshot.js:2949 Drawing UDP precinct feature 158...
screenshot.js:2949 Drawing UDP precinct feature 159...
screenshot.js:2949 Drawing UDP precinct feature 160...
screenshot.js:2949 Drawing UDP precinct feature 161...
screenshot.js:2949 Drawing UDP precinct feature 162...
screenshot.js:2949 Drawing UDP precinct feature 163...
screenshot.js:2949 Drawing UDP precinct feature 164...
screenshot.js:2949 Drawing UDP precinct feature 165...
screenshot.js:2949 Drawing UDP precinct feature 166...
screenshot.js:2949 Drawing UDP precinct feature 167...
screenshot.js:2949 Drawing UDP precinct feature 168...
screenshot.js:2949 Drawing UDP precinct feature 169...
screenshot.js:2949 Drawing UDP precinct feature 170...
screenshot.js:3036 Drawing single feature
screenshot.js:3113 Starting PTAL map capture with feature: {featureId: 'FxNgijC5sGVmQhYxQy3B3', featureType: 'Polygon', coordinates: 1, developableArea: 'provided'}
screenshot.js:3126 Using config: {width: 2048, height: 2048, padding: 1}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:3148 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003907139999995479}
screenshot.js:3155 Created canvas with dimensions: {width: 2048, height: 2048}
screenshot.js:3159 Calculated Mercator bbox: 16802541.513912123,-4014028.808419167,16802976.454747323,-4013593.8675839705
screenshot.js:3177 Prepared aerial parameters: {SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetMap', BBOX: '16802541.513912123,-4014028.808419167,16802976.454747323,-4013593.8675839705', CRS: 'EPSG:3857', …}
screenshot.js:3183 Using PTAL config: {layerId: 28919}
screenshot.js:3186 Fetching project layers from Giraffe...
screenshot.js:3188 Retrieved project layers count: 84
screenshot.js:3191 Found PTAL layer: {found: true, id: 28919, name: 'PTAL_6am-10am (AVG)', defaultGroup: 'Esri FeatureServer', vectorSource: 'present'}
screenshot.js:3216 Vector tile URL: https://layers-node-ehcce5pxxq-ts.a.run.app/featureServer/{z}/{x}/{y}/https%3A%2F%2Fportal.data.nsw.gov.au%2Farcgis%2Frest%2Fservices%2FHosted%2FPTAL_6to10amAVG%2FFeatureServer%2F0%2Fquery%3Fwhere%3D1%3D1%26geometry%3D%7Bbbox-epsg-3857%7D%26geometryType%3DesriGeometryEnvelope%26inSR%3D3857%26spatialRel%3DesriSpatialRelIntersects%26returnGeodetic%3Dfalse%26outFields%3D%2A%26returnGeometry%3Dtrue%26returnCentroid%3Dfalse%26featureEncoding%3DesriDefault%26multipatchOption%3DxyFootprint%26applyVCSProjection%3Dfalse%26returnIdsOnly%3Dfalse%26returnUniqueIdsOnly%3Dfalse%26returnCountOnly%3Dfalse%26returnExtentOnly%3Dfalse%26returnQueryGeometry%3Dfalse%26returnDistinctValues%3Dfalse%26cacheHint%3Dfalse%26returnZ%3Dfalse%26returnM%3Dfalse%26returnExceededLimitFeatures%3Dtrue%26f%3Dgeojson%26token%3DRXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
screenshot.js:3224 Decoded URL: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query?where=1=1&geometry={bbox-epsg-3857}&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&returnZ=false&returnM=false&returnExceededLimitFeatures=true&f=geojson&token=RXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
screenshot.js:3233 Using exact URL from vector tiles: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query
screenshot.js:3236 Extracted token: RXyZib9F4v...
screenshot.js:3254 Prepared PTAL parameters: {where: '1=1', geometry: '16802541.513912123,-4014028.808419167,16802976.454747323,-4013593.8675839705', geometryType: 'esriGeometryEnvelope', inSR: '3857', spatialRel: 'esriSpatialRelIntersects', …}
screenshot.js:3260 Preparing to request: {aerialUrl: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…I=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300', ptalUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…eturnGeometry=true&f=geojson&token=***redacted***'}
screenshot.js:3266 Loading aerial and PTAL layers in parallel...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802541.513912123%2C-4014028.808419167%2C16802976.454747323%2C-4013593.8675839705&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/PTAL_6to10amAVG/FeatureServer/0/query/query?where=1%3D1&geometry=16802541.513912123%2C-4014028.808419167%2C16802976.454747323%2C-4013593.8675839705&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=geojson&token=RXyZib9F4vnjjCOCQUsLuZaraMzIyimQwvk6wMlHfymXXAVNp815mrGCaGFrc9dirqrW8CmSaJVrGscRMGWx6N1imHrY9VF_1XipvW58eYhkYEoCgXQAqjxXf6kBKo4cQxpG0yrwuLzRF-DO-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…O-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC', method: 'GET', bodySize: 'no body', headers: undefined}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…O-PWyZAG0hyGe0DiRw7rPyzgNiigzNqgb4rg99EuoUBNALwdC', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 30000ms
proxyService.js:134 Response content type: text/html
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-531a-7eb4-9930-3fbfe8019958', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:09 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802541.513912123%2C-4014028.808419167%2C16802976.454747323%2C-4013593.8675839705&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:3273 Loaded both layers: {baseMapLoaded: true, ptalResponseFeatures: undefined}
screenshot.js:3280 Drew base map
screenshot.js:3360 No PTAL features found in response
screenshot.js:3375 Drawing single feature
screenshot.js:3379 PTAL map capture completed successfully
accessSlide.js:80 Starting to add access slide...
accessSlide.js:119 Feature validation passed: {type: 'Polygon', geometryType: 'collection', featureCount: 1}
screenshot.js:1879 Starting roads capture... {featureType: 'Polygon', hasMultipleFeatures: false, developableAreaFeatures: 1}
screenshot.js:145 Invalid feature geometry for bounds calculation {featureType: 'Polygon', hasGeometry: false, coordsLength: undefined}
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js:145
captureRoadsMap @ screenshot.js:1893
addAccessSlide @ accessSlide.js:126
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js:172 No valid coordinates found for bounds calculation, using default bounds
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js:172
captureRoadsMap @ screenshot.js:1893
addAccessSlide @ accessSlide.js:126
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
screenshot.js:1896 Fetching road features...
screenshot.js:1809 Fetching road features with params: {centerX: 0, centerY: 0, size: 1000}
screenshot.js:1814 Query bbox (expanded): -600,-600,600,600
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/0/query?f=json&geometry=-600%2C-600%2C600%2C600&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=ROADNAMEST%2CFUNCTION%2CLANECOUNT&returnGeometry=true&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…e&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…e&inSR=4283&outSR=4283&where=FUNCTION+IS+NOT+NULL', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 120000ms
proxyService.js:134 Response content type: application/json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
screenshot.js:1832 Road features response: {displayFieldName: 'roadnameba', fieldAliases: {…}, geometryType: 'esriGeometryPolyline', spatialReference: {…}, fields: Array(3), …}
screenshot.js:1835 Found 2000 road features
screenshot.js:1867 Converted and deduplicated features: (474) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
screenshot.js:1898 Retrieved road features: (474) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
screenshot.js:1926 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:31 loadImage: Failed to load image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300 Event {isTrusted: true, type: 'error', target: img, currentTarget: img, eventPhase: 2, …}
(anonymous) @ rrweb-plugin-console-record.js:2447
img.onerror @ image.js:31Understand this errorAI
image.js:36 Using fallback transparent image
screenshot.js:1955 Loading roads layer...
screenshot.js:1979 Requesting roads layer through proxy... https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: RoadSegment/MapServer
proxyService.js:73 Proxy request details: {url: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/service…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-5ed3-759f-863e-16852896a9b1', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:12 GMT+1100 (Australian Eastern Daylight Time)}
proxyService.js:134 Response content type: image/png
screenshot.js:1984 Loading roads image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/216c7a0d-fa47-434d-9ae0-87907fab5349
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/216c7a0d-fa47-434d-9ae0-87907fab5349
screenshot.js:1986 Roads layer loaded successfully
screenshot.js:2001 Loading road labels layer...
screenshot.js:2011 Labels bbox: -55659745.38888889,-55659745.38888889,55659745.38888889,55659745.38888889
screenshot.js:2026 Requesting road labels through proxy... https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: sixmaps/LPI_RasterLabels_1
proxyService.js:73 Proxy request details: {url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/s…&bboxSR=3857&imageSR=3857&layers=show%3A0&dpi=192', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
screenshot.js:2033 Loading road labels from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/6a5e3946-0930-425c-8106-fff47cee72fa
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/6a5e3946-0930-425c-8106-fff47cee72fa
screenshot.js:2035 Road labels loaded successfully
screenshot.js:2043 Drawing developable area boundaries...
screenshot.js:2060 Drawing single feature
scoringLogic.js:1368 === Roads Score Calculation Start ===
scoringLogic.js:1369 Raw road features: [
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          144.81698176131306,
          -36.07518262853864
        ],
        [
          144.81753632688662,
          -36.07525045000972
        ],
        [
          144.81761307648162,
          -36.07525983529655
        ]
      ]
    },
    "properties": {
      "ROADNAMEST": "OLD BARMAH ROAD",
      "FUNCTION": "LocalRoad",
      "LANECOUNT": "1"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          151.00962993177552,
          -30.771265240289495
        ],
        [
          151.00976131682728,
          -30.771027739645035
        ],
        [
          151.00984314003483,
          -30.770777070914164
        ],
        [
          151.0099132473207,
          -30.77053135030019
        ],
        [
          151.01003408176825,
          -30.77027551831702
        ],
        [
          151.01015046111786,
          -30.770132184280214
        ],
        [
          151.01032795688172,
          -30.77000634793194
        ],
        [
          151.01050666278275,
          -30.769873949950465
        ],
        [
          151.0106929432468,
          -30.76972051350839
        ],
        [
          151.01086022903758,
          -30.769596362388313
        ],
        [
          151.0112265241437,
          -30.769430851465472
        ],
        [
          151.01147237921737,
          -30.76939578437657
        ],
        [
          151.0116509954786,
          -30.769369950186785
        ],
        [
          151.0118543164682,
          -30.769258008007228
        ],
        [
          151.01189348009586,
          -30.769214389281558
        ],
        [
          151.01209486486584,
          -30.768978000170534
        ],
        [
          151.0121585987622,
          -30.768942180107274
        ],
        [
          151.01234651963443,
          -30.768879665312227
        ],
        [
          151.01250373887592,
          -30.76888161049584
        ],
        [
          151.01269083506213,
          -30.768938971002513
        ],
        [
          151.01294540312415,
          -30.769014662847894
        ],
        [
          151.01310873579985,
          -30.769073834078483
        ],
        [
          151.0134203954492,
          -30.76923187800611
        ],
        [
          151.01357316855672,
          -30.76933910513236
        ],
        [
          151.01375483257118,
          -30.769532153401087
        ],
        [
          151.01381678263544,
          -30.769613824220926
        ],
        [
          151.01401425911024,
          -30.76974616841858
        ],
        [
          151.01408205368932,
          -30.769791597868107
        ],
        [
          151.01420982625723,
          -30.76989298047954
        ],
        [
          151.01442343789563,
          -30.77010270175066
        ],
        [
          151.01469696477488,
          -30.770345240151812
        ],
        [
          151.01482029120882,
          -30.770573785780527
        ],
        [
          151.01493094257535,
          -30.770767282248244
        ],
        [
          151.0149983517034,
          -30.770885158582473
        ],
        [
          151.01514476934926,
          -30.771104426492116
        ],
        [
          151.01517856355304,
          -30.77114717571169
        ],
        [
          151.015206997297,
          -30.771183139198627
        ]
      ]
    },
    "properties": {
      "ROADNAMEST": "MANGANESE MOUNTAIN FIRETRAIL",
      "FUNCTION": "Track-Vehicular",
      "LANECOUNT": "1"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          150.87575803895083,
          -29.615914612068707
        ],
        [
          150.87575803895083,
          -29.615464898166692
        ],
        [
          150.87572472880197,
          -29.614965219041324
        ],
        [
          150.87564977200293,
          -29.614423902229817
        ],
        [
          150.87566271598973,
          -29.61419045330416
        ],
        [
          150.87566989613754,
          -29.61384837887141
        ]
      ]
    },
    "properties": {
      "ROADNAMEST": "DELUNGRA ROAD",
      "FUNCTION": "ArterialRoad",
      "LANECOUNT": "1"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          149.24975591979432,
          -34.895370312403315
        ],
        [
          149.24996656435542,
          -34.894833190734346
        ],
        [
          149.2501333123074,
          -34.89447419230777
        ],
        [
          149.2501359387535,
          -34.89446419747031
        ],
        [
          149.25023581541632,
          -34.894089691358715
        ],
        [
          149.25082556461064,
          -34.89164106374761
        ],

scoringLogic.js:1370 Raw developable area: [
  {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            150.9416163,
            -33.88824365
          ],
          [
            150.94142515,
            -33.88875662
          ],
          [
            150.94158416,
            -33.88879424
          ],
          [
            150.94160311,
            -33.88878877
          ],
          [
            150.9418188,
            -33.88853165
          ],
          [
            150.94206536,
            -33.88833777
          ],
          [
            150.9416163,
            -33.88824365
          ]
        ]
      ]
    },
    "properties": {
      "id": "_PuEfAU-rPHMYpbTyXwGc",
      "appId": "1",
      "usage": "Developable Area",
      "public": true,
      "layerId": "Dev Area A",
      "projectId": "50986"
    }
  }
]
scoringLogic.js:1371 All properties: none
scoringLogic.js:1384 Processing developable area 1...
scoringLogic.js:1388 Created developable polygon 1
scoringLogic.js:1392 Creating buffer of 50 meters around developable area 1
scoringLogic.js:1412 Processing 474 road features for area 1
scoringLogic.js:1453 Found nearby road for area 1: {name: ' ', function: 'UrbanServiceLane', laneCount: 1}
scoringLogic.js:1467 
Nearby roads for all areas: [{…}]
scoringLogic.js:1496 Final score: 2 (Multiple lanes: false)
screenshot.js:2790 Starting UDP precinct map capture...
screenshot.js:145 Invalid feature geometry for bounds calculation {featureType: 'Polygon', hasGeometry: false, coordsLength: undefined}
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js:145
captureUDPPrecinctMap @ screenshot.js:2807
addAccessSlide @ accessSlide.js:164
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js:172 No valid coordinates found for bounds calculation, using default bounds
(anonymous) @ rrweb-plugin-console-record.js:2447
calculateBounds @ screenshot.js:172
captureUDPPrecinctMap @ screenshot.js:2807
addAccessSlide @ accessSlide.js:164
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
screenshot.js:2815 Loading aerial base layer...
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:31 loadImage: Failed to load image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-55659745.38888889%2C-55659745.38888889%2C55659745.38888889%2C55659745.38888889&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300 Event {isTrusted: true, type: 'error', target: img, currentTarget: img, eventPhase: 2, …}
(anonymous) @ rrweb-plugin-console-record.js:2447
img.onerror @ image.js:31Understand this errorAI
image.js:36 Using fallback transparent image
screenshot.js:2844 Loading LMR layers...
screenshot.js:2867 Requesting LMR layers through proxy... https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-500%2C-500%2C500%2C500&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export?f=image&format=png32&transparent=true&size=2048%2C2048&bbox=-500%2C-500%2C500%2C500&bboxSR=4283&imageSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:73 Proxy request details: {url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgi…geSR=3857&layers=show%3A0%2C1%2C2%2C3%2C4&dpi=300', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: image/png
screenshot.js:2871 Loading LMR image from proxy URL...
image.js:2 loadImage: Loading image from blob:http://localhost:5173/f3623750-49c9-47d2-9b5c-08e768749a35
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/f3623750-49c9-47d2-9b5c-08e768749a35
screenshot.js:2873 LMR layers loaded successfully
screenshot.js:2917 Invalid feature for LMR overlap check
(anonymous) @ rrweb-plugin-console-record.js:2447
captureUDPPrecinctMap @ screenshot.js:2917
await in captureUDPPrecinctMap
addAccessSlide @ accessSlide.js:164
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this warningAI
screenshot.js:2931 Loading UDP precincts...
screenshot.js:2936 Drawing 170 UDP precinct features...
screenshot.js:2949 Drawing UDP precinct feature 1...
screenshot.js:2949 Drawing UDP precinct feature 2...
screenshot.js:2949 Drawing UDP precinct feature 3...
screenshot.js:2949 Drawing UDP precinct feature 4...
screenshot.js:2949 Drawing UDP precinct feature 5...
screenshot.js:2949 Drawing UDP precinct feature 6...
screenshot.js:2949 Drawing UDP precinct feature 7...
screenshot.js:2949 Drawing UDP precinct feature 8...
screenshot.js:2949 Drawing UDP precinct feature 9...
screenshot.js:2949 Drawing UDP precinct feature 10...
screenshot.js:2949 Drawing UDP precinct feature 11...
screenshot.js:2949 Drawing UDP precinct feature 12...
screenshot.js:2949 Drawing UDP precinct feature 13...
screenshot.js:2949 Drawing UDP precinct feature 14...
screenshot.js:2949 Drawing UDP precinct feature 15...
screenshot.js:2949 Drawing UDP precinct feature 16...
screenshot.js:2949 Drawing UDP precinct feature 17...
screenshot.js:2949 Drawing UDP precinct feature 18...
screenshot.js:2949 Drawing UDP precinct feature 19...
screenshot.js:2949 Drawing UDP precinct feature 20...
screenshot.js:2949 Drawing UDP precinct feature 21...
screenshot.js:2949 Drawing UDP precinct feature 22...
screenshot.js:2949 Drawing UDP precinct feature 23...
screenshot.js:2949 Drawing UDP precinct feature 24...
screenshot.js:2949 Drawing UDP precinct feature 25...
screenshot.js:2949 Drawing UDP precinct feature 26...
screenshot.js:2949 Drawing UDP precinct feature 27...
screenshot.js:2949 Drawing UDP precinct feature 28...
screenshot.js:2949 Drawing UDP precinct feature 29...
screenshot.js:2949 Drawing UDP precinct feature 30...
screenshot.js:2949 Drawing UDP precinct feature 31...
screenshot.js:2949 Drawing UDP precinct feature 32...
screenshot.js:2949 Drawing UDP precinct feature 33...
screenshot.js:2949 Drawing UDP precinct feature 34...
screenshot.js:2949 Drawing UDP precinct feature 35...
screenshot.js:2949 Drawing UDP precinct feature 36...
screenshot.js:2949 Drawing UDP precinct feature 37...
screenshot.js:2949 Drawing UDP precinct feature 38...
screenshot.js:2949 Drawing UDP precinct feature 39...
screenshot.js:2949 Drawing UDP precinct feature 40...
screenshot.js:2949 Drawing UDP precinct feature 41...
screenshot.js:2949 Drawing UDP precinct feature 42...
screenshot.js:2949 Drawing UDP precinct feature 43...
screenshot.js:2949 Drawing UDP precinct feature 44...
screenshot.js:2949 Drawing UDP precinct feature 45...
screenshot.js:2949 Drawing UDP precinct feature 46...
screenshot.js:2949 Drawing UDP precinct feature 47...
screenshot.js:2949 Drawing UDP precinct feature 48...
screenshot.js:2949 Drawing UDP precinct feature 49...
screenshot.js:2949 Drawing UDP precinct feature 50...
screenshot.js:2949 Drawing UDP precinct feature 51...
screenshot.js:2949 Drawing UDP precinct feature 52...
screenshot.js:2949 Drawing UDP precinct feature 53...
screenshot.js:2949 Drawing UDP precinct feature 54...
screenshot.js:2949 Drawing UDP precinct feature 55...
screenshot.js:2949 Drawing UDP precinct feature 56...
screenshot.js:2949 Drawing UDP precinct feature 57...
screenshot.js:2949 Drawing UDP precinct feature 58...
screenshot.js:2949 Drawing UDP precinct feature 59...
screenshot.js:2949 Drawing UDP precinct feature 60...
screenshot.js:2949 Drawing UDP precinct feature 61...
screenshot.js:2949 Drawing UDP precinct feature 62...
screenshot.js:2949 Drawing UDP precinct feature 63...
screenshot.js:2949 Drawing UDP precinct feature 64...
screenshot.js:2949 Drawing UDP precinct feature 65...
screenshot.js:2949 Drawing UDP precinct feature 66...
screenshot.js:2949 Drawing UDP precinct feature 67...
screenshot.js:2949 Drawing UDP precinct feature 68...
screenshot.js:2949 Drawing UDP precinct feature 69...
screenshot.js:2949 Drawing UDP precinct feature 70...
screenshot.js:2949 Drawing UDP precinct feature 71...
screenshot.js:2949 Drawing UDP precinct feature 72...
screenshot.js:2949 Drawing UDP precinct feature 73...
screenshot.js:2949 Drawing UDP precinct feature 74...
screenshot.js:2949 Drawing UDP precinct feature 75...
screenshot.js:2949 Drawing UDP precinct feature 76...
screenshot.js:2949 Drawing UDP precinct feature 77...
screenshot.js:2949 Drawing UDP precinct feature 78...
screenshot.js:2949 Drawing UDP precinct feature 79...
screenshot.js:2949 Drawing UDP precinct feature 80...
screenshot.js:2949 Drawing UDP precinct feature 81...
screenshot.js:2949 Drawing UDP precinct feature 82...
screenshot.js:2949 Drawing UDP precinct feature 83...
screenshot.js:2949 Drawing UDP precinct feature 84...
screenshot.js:2949 Drawing UDP precinct feature 85...
screenshot.js:2949 Drawing UDP precinct feature 86...
screenshot.js:2949 Drawing UDP precinct feature 87...
screenshot.js:2949 Drawing UDP precinct feature 88...
screenshot.js:2949 Drawing UDP precinct feature 89...
screenshot.js:2949 Drawing UDP precinct feature 90...
screenshot.js:2949 Drawing UDP precinct feature 91...
screenshot.js:2949 Drawing UDP precinct feature 92...
screenshot.js:2949 Drawing UDP precinct feature 93...
screenshot.js:2949 Drawing UDP precinct feature 94...
screenshot.js:2949 Drawing UDP precinct feature 95...
screenshot.js:2949 Drawing UDP precinct feature 96...
screenshot.js:2949 Drawing UDP precinct feature 97...
screenshot.js:2949 Drawing UDP precinct feature 98...
screenshot.js:2949 Drawing UDP precinct feature 99...
screenshot.js:2949 Drawing UDP precinct feature 100...
screenshot.js:2949 Drawing UDP precinct feature 101...
screenshot.js:2949 Drawing UDP precinct feature 102...
screenshot.js:2949 Drawing UDP precinct feature 103...
screenshot.js:2949 Drawing UDP precinct feature 104...
screenshot.js:2949 Drawing UDP precinct feature 105...
screenshot.js:2949 Drawing UDP precinct feature 106...
screenshot.js:2949 Drawing UDP precinct feature 107...
screenshot.js:2949 Drawing UDP precinct feature 108...
screenshot.js:2949 Drawing UDP precinct feature 109...
screenshot.js:2949 Drawing UDP precinct feature 110...
screenshot.js:2949 Drawing UDP precinct feature 111...
screenshot.js:2949 Drawing UDP precinct feature 112...
screenshot.js:2949 Drawing UDP precinct feature 113...
screenshot.js:2949 Drawing UDP precinct feature 114...
screenshot.js:2949 Drawing UDP precinct feature 115...
screenshot.js:2949 Drawing UDP precinct feature 116...
screenshot.js:2949 Drawing UDP precinct feature 117...
screenshot.js:2949 Drawing UDP precinct feature 118...
screenshot.js:2949 Drawing UDP precinct feature 119...
screenshot.js:2949 Drawing UDP precinct feature 120...
screenshot.js:2949 Drawing UDP precinct feature 121...
screenshot.js:2949 Drawing UDP precinct feature 122...
screenshot.js:2949 Drawing UDP precinct feature 123...
screenshot.js:2949 Drawing UDP precinct feature 124...
screenshot.js:2949 Drawing UDP precinct feature 125...
screenshot.js:2949 Drawing UDP precinct feature 126...
screenshot.js:2949 Drawing UDP precinct feature 127...
screenshot.js:2949 Drawing UDP precinct feature 128...
screenshot.js:2949 Drawing UDP precinct feature 129...
screenshot.js:2949 Drawing UDP precinct feature 130...
screenshot.js:2949 Drawing UDP precinct feature 131...
screenshot.js:2949 Drawing UDP precinct feature 132...
screenshot.js:2949 Drawing UDP precinct feature 133...
screenshot.js:2949 Drawing UDP precinct feature 134...
screenshot.js:2949 Drawing UDP precinct feature 135...
screenshot.js:2949 Drawing UDP precinct feature 136...
screenshot.js:2949 Drawing UDP precinct feature 137...
screenshot.js:2949 Drawing UDP precinct feature 138...
screenshot.js:2949 Drawing UDP precinct feature 139...
screenshot.js:2949 Drawing UDP precinct feature 140...
screenshot.js:2949 Drawing UDP precinct feature 141...
screenshot.js:2949 Drawing UDP precinct feature 142...
screenshot.js:2949 Drawing UDP precinct feature 143...
screenshot.js:2949 Drawing UDP precinct feature 144...
screenshot.js:2949 Drawing UDP precinct feature 145...
screenshot.js:2949 Drawing UDP precinct feature 146...
screenshot.js:2949 Drawing UDP precinct feature 147...
screenshot.js:2949 Drawing UDP precinct feature 148...
screenshot.js:2949 Drawing UDP precinct feature 149...
screenshot.js:2949 Drawing UDP precinct feature 150...
screenshot.js:2949 Drawing UDP precinct feature 151...
screenshot.js:2949 Drawing UDP precinct feature 152...
screenshot.js:2949 Drawing UDP precinct feature 153...
screenshot.js:2949 Drawing UDP precinct feature 154...
screenshot.js:2949 Drawing UDP precinct feature 155...
screenshot.js:2949 Drawing UDP precinct feature 156...
screenshot.js:2949 Drawing UDP precinct feature 157...
screenshot.js:2949 Drawing UDP precinct feature 158...
screenshot.js:2949 Drawing UDP precinct feature 159...
screenshot.js:2949 Drawing UDP precinct feature 160...
screenshot.js:2949 Drawing UDP precinct feature 161...
screenshot.js:2949 Drawing UDP precinct feature 162...
screenshot.js:2949 Drawing UDP precinct feature 163...
screenshot.js:2949 Drawing UDP precinct feature 164...
screenshot.js:2949 Drawing UDP precinct feature 165...
screenshot.js:2949 Drawing UDP precinct feature 166...
screenshot.js:2949 Drawing UDP precinct feature 167...
screenshot.js:2949 Drawing UDP precinct feature 168...
screenshot.js:2949 Drawing UDP precinct feature 169...
screenshot.js:2949 Drawing UDP precinct feature 170...
screenshot.js:3036 Drawing single feature
accessSlide.js:181 LMR overlap data for scoring: {hasOverlap: false, primaryOverlap: null, pixelCounts: {…}}
accessSlide.js:182 Developable area LMR overlap for scoring: []
scoringLogic.js:1537 === UDP Precincts Score Calculation Start ===
scoringLogic.js:1538 Input validation:
scoringLogic.js:1539 precinctFeatures: {
  "0": {
    "type": "Feature",
    "id": 1,
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            150.74280006000004,
            -33.89809970712612
          ],
          [
            150.7420364630001,
            -33.89788295012608
          ],
          [
            150.74199094400012,
            -33.897918923126106
          ],
          [
            150.74196275300005,
            -33.89794320712613
          ],
          [
            150.74193311800002,
            -33.89796082112611
          ],
          [
            150.7418614510001,
            -33.89802097812613
          ],
          [
            150.74181359200009,
            -33.898115548126114
          ],
          [
            150.74181326000007,
            -33.898226441126106
          ],
          [
            150.74178178800003,
            -33.89826424212614
          ],
          [
            150.7415948250001,
            -33.898235898126096
          ],
          [
            150.74137445500003,
            -33.8981723271261
          ],
          [
            150.74120996600004,
            -33.89822066812611
          ],
          [
            150.7411177990001,
            -33.898309743126106
          ],
          [
            150.74096696200002,
            -33.8984897491261
          ],
          [
            150.7409849070001,
            -33.89863584512608
          ],
          [
            150.74102017200005,
            -33.898771156126095
          ],
          [
            150.74097432100007,
            -33.898918918126135
          ],
          [
            150.74076125700003,
            -33.89894101512612
          ],
          [
            150.74056220300008,
            -33.89897395712609
          ],
          [
            150.74042253400012,
            -33.8990376821261
          ],
          [
            150.74038771900007,
            -33.89911333812609
          ],
          [
            150.74036817600006,
            -33.899135838126085
          ],
          [
            150.74023940900008,
            -33.899168923126105
          ],
          [
            150.7400255550001,
            -33.89909455012611
          ],
          [
            150.73997931000008,
            -33.899015110126136
          ],
          [
            150.7399279550001,
            -33.89883377812612
          ],
          [
            150.73982892100003,
            -33.89869111612609
          ],
          [
            150.73978589400008,
            -33.89861528112613
          ],
          [
            150.73975669900005,
            -33.898615218126125
          ],
          [
            150.73971761500002,
            -33.898668339126125
          ],
          [
            150.73964596700011,
            -33.89876376112608
          ],
          [
            150.7394900480001,
            -33.898839165126105
          ],
          [
            150.73925331700002,
            -33.89882062712611
          ],
          [
            150.73895860000005,
            -33.898673950126124
          ],
          [
            150.73882260800008,
            -33.898597926126115
          ],
          [
            150.73858790300005,
            -33.89861636512609
          ],
          [
            150.73843144600005,
            -33.8986204711261
          ],
          [
            150.73805887600008,
            -33.898947056126076
          ],
          [
            150.7380188520001,
            -33.89895520412609
          ],
          [
            150.73797768000009,
            -33.89898397012609
          ],
          [
            150.73793656300006,
            -33.89899469912609
          ],
          [
            150.73786290600003,
            -33.89903782512614
          ],
          [
            150.73782607300006,
            -33.89906209012612
          ],
          [
            150.73779678800008,
            -33.89909268412612
          ],
          [
            150.73774153400007,
            -33.899126820126135
          ],
          [
            150.7377014110001,
            -33.89916731012607
          ],
          [
            150.73766341200007,
            -33.89921591212611
          ],
          [
            150.73763315000008,
            -33.89921314312606
          ],
          [
            150.7375727960001,
            -33.89915080812607
          ],
          [
            150.73751350800012,
            -33.89909297112609
          ],
          [
            150.73744124900009,
            -33.899030619126094
          ],
          [
            150.73738738400004,
            -33.8989655931261
          ],
          [
            150.73736370100005,
            -33.89893127012613
          ],
          [
            150.73733482000011,
            -33.8988320391261
          ],
          [
            150.73731558300005,
            -33.898757162126124
          ],
          [
            150.7372962
scoringLogic.js:1540 developableArea: [
  {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            150.9416163,
            -33.88824365
          ],
          [
            150.94142515,
            -33.88875662
          ],
          [
            150.94158416,
            -33.88879424
          ],
          [
            150.94160311,
            -33.88878877
          ],
          [
            150.9418188,
            -33.88853165
          ],
          [
            150.94206536,
            -33.88833777
          ],
          [
            150.9416163,
            -33.88824365
          ]
        ]
      ]
    },
    "properties": {
      "id": "_PuEfAU-rPHMYpbTyXwGc",
      "appId": "1",
      "usage": "Developable Area",
      "public": true,
      "layerId": "Dev Area A",
      "projectId": "50986"
    }
  }
]
scoringLogic.js:1553 LMR overlap data: {hasOverlap: false, primaryOverlap: null, pixelCounts: {…}}
scoringLogic.js:1554 Developable area LMR overlap: []
scoringLogic.js:1591 Processing developable area 1...
scoringLogic.js:1599 Processing 0 precinct features for area 1
scoringLogic.js:1678 Results for all developable areas: [{…}]
scoringLogic.js:1698 
Final result: {score: 1, bestResult: {…}, lmrOverlap: {…}, hasNearbyLMR: false}
screenshot.js:3113 Starting PTAL map capture with feature: {featureId: undefined, featureType: undefined, coordinates: undefined, developableArea: 'provided'}
screenshot.js:3126 Using config: {width: 2048, height: 2048, padding: 1}
screenshot.js:3135 Feature has invalid geometry: undefined
(anonymous) @ rrweb-plugin-console-record.js:2447
capturePTALMap @ screenshot.js:3135
addAccessSlide @ accessSlide.js:205
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
accessSlide.js:214 PTAL screenshot creation failed
(anonymous) @ rrweb-plugin-console-record.js:2447
addAccessSlide @ accessSlide.js:214
await in addAccessSlide
generateReport @ powerpoint.js?t=1741318774283:98
generatePropertyReport @ ReportGenerator.jsx:1002Understand this errorAI
scoringLogic.js:448 === PTAL Score Calculation Start ===
scoringLogic.js:449 PTAL values: (2000) ['6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '3 - Medium', '3 - Medium', '3 - Medium', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '6 - Very High', '5 - High', '2 - Low-Medium', '6 - Very High', '6 - Very High', '6 - Very High', '3 - Medium', '3 - Medium', '1 - Low', '3 - Medium', '2 - Low-Medium', '3 - Medium', '3 - Medium', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '3 - Medium', '2 - Low-Medium', '3 - Medium', '3 - Medium', '3 - Medium', '1 - Low', '1 - Low', '3 - Medium', '2 - Low-Medium', '2 - Low-Medium', '6 - Very High', '5 - High', '4 - Medium-High', '6 - Very High', '4 - Medium-High', '2 - Low-Medium', '5 - High', '5 - High', '4 - Medium-High', '6 - Very High', '1 - Low', '2 - Low-Medium', '2 - Low-Medium', '2 - Low-Medium', '6 - Very High', '6 - Very High', '3 - Medium', '5 - High', '6 - Very High', '2 - Low-Medium', '4 - Medium-High', '2 - Low-Medium', '5 - High', '5 - High', '6 - Very High', '4 - Medium-High', '2 - Low-Medium', '4 - Medium-High', '3 - Medium', '4 - Medium-High', '1 - Low', '4 - Medium-High', '6 - Very High', '6 - Very High', '1 - Low', '1 - Low', '1 - Low', '6 - Very High', '2 - Low-Medium', '2 - Low-Medium', '3 - Medium', …]
scoringLogic.js:450 Feature PTALs: []
scoringLogic.js:454 Processing PTAL for multiple features
scoringLogic.js:492 Best PTAL score across all features: 1
powerpoint.js?t=1741318774283:153 XHR finished loading: GET "http://localhost:5173/images/NSW-Government-official-logo.jpg".
(anonymous) @ pptxgenjs.js?v=d62f88a8:6192
(anonymous) @ pptxgenjs.js?v=d62f88a8:6112
encodeSlideMediaRels @ pptxgenjs.js?v=d62f88a8:6111
(anonymous) @ pptxgenjs.js?v=d62f88a8:7461
(anonymous) @ pptxgenjs.js?v=d62f88a8:7460
step @ pptxgenjs.js?v=d62f88a8:2496
(anonymous) @ pptxgenjs.js?v=d62f88a8:2448
(anonymous) @ pptxgenjs.js?v=d62f88a8:2435
__awaiter @ pptxgenjs.js?v=d62f88a8:2417
PptxGenJS2.exportPresentation @ pptxgenjs.js?v=d62f88a8:7451
(anonymous) @ pptxgenjs.js?v=d62f88a8:7852
step @ pptxgenjs.js?v=d62f88a8:2496
(anonymous) @ pptxgenjs.js?v=d62f88a8:2448
(anonymous) @ pptxgenjs.js?v=d62f88a8:2435
__awaiter @ pptxgenjs.js?v=d62f88a8:2417
PptxGenJS2.writeFile @ pptxgenjs.js?v=d62f88a8:7840
generateReport @ powerpoint.js?t=1741318774283:153
await in generateReport
generatePropertyReport @ ReportGenerator.jsx:1002
93rrweb-plugin-console-record.js:2447 error parsing message SyntaxError: Unexpected token 's', "setImmedia"... is not valid JSON
    at JSON.parse (<anonymous>)
    at @gi-nx_iframe-sdk.js?v=d62f88a8:704:25
tokenUtils.js:59 Getting user name from GiraffeSdk state: {id: 2907, name: 'James Strutt', email: 'james.strutt@dpie.nsw.gov.au', hubspot_props: {…}, preferences: {…}, …}
tokenUtils.js:65 Selected user name from state: James Strutt
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-6a81-7635-96d1-498fe5535f5f', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:15 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-7252-7c5d-b69c-a3ea11675390', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:17 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-834e-7277-8cac-6f331b3069ce', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:22 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-9ea0-7a88-9b23-9d475c11dbba', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:29 GMT+1100 (Australian Eastern Daylight Time)}
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-ae49-79db-9c23-302c4f4c1032', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:33 GMT+1100 (Australian Eastern Daylight Time)}
ReportGenerator.jsx:346 Selected Features: [{…}]
ReportGenerator.jsx:347 Addresses: ['139 Railway Parade Canley Vale 2166']
screenshot.js:35 captureMapScreenshot: Starting to capture cover screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003125711999996383
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802585.007995643,-4013985.3143356475,16802932.960663803,-4013637.36166749
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for cover
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
ReportGenerator.jsx:356 Starting fetchSalesData with params: {originalSuburb: 'Canley Vale', uppercaseSuburb: 'CANLEY VALE', fullProperties: {…}}
ReportGenerator.jsx:363 Fetching CSV data for: CANLEY VALE
ReportGenerator.jsx:370 CSV parsing complete: {totalRows: 126252, sampleRow: {…}, headers: Array(10)}
ReportGenerator.jsx:419 Processed sales data: {originalLength: 126252, filteredLength: 87, sample: Array(3), suburb: 'CANLEY VALE', uniqueSuburbs: Array(1)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802585.007995643%2C-4013985.3143356475%2C16802932.960663803%2C-4013637.36166749&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured cover screenshot
screenshot.js:35 captureMapScreenshot: Starting to capture aerial screenshot
screenshot.js:37 captureMapScreenshot: Using config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
screenshot.js:40 captureMapScreenshot: Calculated bounds - centerX: 150.94175210999998, centerY: -33.888285455, size: 0.0018233319999978901
screenshot.js:44 captureMapScreenshot: Calculated mercator params - bbox: 16802657.498134844,-4013912.824196448,16802860.4705246,-4013709.8518066895
screenshot.js:49 captureMapScreenshot: Base map image not captured or not needed
screenshot.js:51 captureMapScreenshot: Getting main image for aerial
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802657.498134844%2C-4013912.824196448%2C16802860.4705246%2C-4013709.8518066895&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
screenshot.js:55 captureMapScreenshot: Main image captured
screenshot.js:117 captureMapScreenshot: Successfully captured aerial screenshot
contextScreenshot.js:285 Starting GPR capture with feature: {type: 'Feature', geometry: {…}, properties: {…}, id: 'FxNgijC5sGVmQhYxQy3B3'}
contextScreenshot.js:327 Calculating bounds...
screenshot.js:142 Processing single feature with coordinates
screenshot.js:163 Using single feature + developable areas for bounds
screenshot.js:177 Using 17 coordinates for bounds calculation
screenshot.js:197 Calculated bounds: {minX: 150.94110092, minY: -33.88880418, maxX: 150.9424033, maxY: -33.88776673, width: 0.001302379999998493, …}
contextScreenshot.js:329 Calculated bounds: {centerX: 150.94175210999998, centerY: -33.888285455, size: 0.003386187999996082}
contextScreenshot.js:334 Creating canvas...
contextScreenshot.js:340 Loading aerial base layer...
contextScreenshot.js:342 Aerial config: {url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1…zziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service', layers: 'Australia_latest', opacity: 1, width: 2048, height: 2048, …}
image.js:2 loadImage: Loading image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
posthog-js.js?v=d62f88a8:64 [PostHog.js] send "$snapshot" {uuid: '01956eb1-ebd0-7aca-a85d-1d8be52682cd', event: '$snapshot', properties: {…}, timestamp: Fri Mar 07 2025 14:41:48 GMT+1100 (Australian Eastern Daylight Time)}
image.js:25 loadImage: Successfully loaded image from https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=16802570.509967804%2C-4013999.8123634877%2C16802947.45869164%2C-4013622.86363965&CRS=EPSG%3A3857&WIDTH=2048&HEIGHT=2048&LAYERS=Australia_latest&STYLES=&FORMAT=image%2Fpng&DPI=300&MAP_RESOLUTION=300&FORMAT_OPTIONS=dpi%3A300
contextScreenshot.js:344 Base map image loaded successfully
contextScreenshot.js:356 Starting GPR layer capture...
contextScreenshot.js:365 Generating fresh GPR token...
contextScreenshot.js:20 Requesting GPR token...
contextScreenshot.js:28 Token response (raw): mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.
contextScreenshot.js:37 Successfully generated token
contextScreenshot.js:367 Raw token received: mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.
contextScreenshot.js:369 Token set in config: mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.
contextScreenshot.js:371 Calculating Mercator parameters...
contextScreenshot.js:373 Mercator parameters: {centerMercX: 16802758.984329723, centerMercY: -4013811.338001569, sizeInMeters: 376.9487238373856, bbox: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', mercatorCoords: Array(2)}
contextScreenshot.js:387 Transformed bbox to GDA94: {original: '16802570.509967804,-4013999.8123634877,16802947.45869164,-4013622.86363965', transformed: '150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906'}
contextScreenshot.js:393 Getting GPR image...
contextScreenshot.js:399 GPR request URL: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/export?bbox=150.9400590160002,-33.88969092528371,150.94344520399974,-33.88687996155906&size=2048,2048&dpi=96&format=png&transparent=true&layers=show:2&token=mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.&f=image&bboxSR=4283&imageSR=3857
image.js:2 loadImage: Loading image from blob:http://localhost:5173/baf507ce-652e-4e73-81d9-cf6942e5c8de
image.js:25 loadImage: Successfully loaded image from blob:http://localhost:5173/baf507ce-652e-4e73-81d9-cf6942e5c8de
contextScreenshot.js:412 GPR image received
contextScreenshot.js:414 GPR layer drawn
contextScreenshot.js:434 Making GPR feature request...
proxyService.js:7 Debug - PROXY_CONFIG: {baseUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', allowedDomains: Array(9)}
proxyService.js:8 Debug - proxyUrl being used: https://proxy-server.jameswilliamstrutt.workers.dev
proxyService.js:11 Sending proxy request for: https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer/2/query?where=1%3D1&geometry=150.9400590160002%2C-33.88969092528371%2C150.94344520399974%2C-33.88687996155906&geometryType=esriGeometryEnvelope&inSR=4283&outSR=4283&spatialRel=esriSpatialRelIntersects&outFields=AGENCY_NAME%2CPROPERTY_NAME%2CPRIMARY_USE_TYPE%2CIMPROVEMENTS%2COBJECTID&returnGeometry=true&f=geojson&token=mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.
proxyService.js:46 ArcGIS Export or MapServer request detected
proxyService.js:56 Added Referer header for ArcGIS service
proxyService.js:62 Set extended timeout for ArcGIS service
proxyService.js:68 ArcGIS Service: GPR/GPR_shared
proxyService.js:73 Proxy request details: {url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.', method: 'GET', bodySize: 'no body', headers: {…}}
proxyService.js:99 Sending request to proxy: {proxyUrl: 'https://proxy-server.jameswilliamstrutt.workers.dev', method: 'POST', targetUrl: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/servi…oken=mXA8Bhz8qD4Wpszk5H4lTnnu1U0KZOlaCv1KZAA2VPY.', targetMethod: 'GET', hasBody: false}
proxyService.js:109 Setting request timeout to 60000ms
proxyService.js:134 Response content type: application/geo+json;charset=UTF-8
proxyService.js:151 Successfully parsed JSON response
contextScreenshot.js:437 GPR feature response received: {hasFeatures: true, featureCount: 33, type: 'FeatureCollection', status: undefined}
contextScreenshot.js:445 Found 33 GPR features
contextScreenshot.js:470 Drawing feature boundaries...
contextScreenshot.js:97 Drawing feature boundaries with: {featureType: 'Feature', isArray: false, hasFeatures: undefined, coordinates: 'Has coordinates'}
contextScreenshot.js:119 Drawing single GeoJSON feature boundary
contextScreenshot.js:479 Drawing developable area boundaries...
contextScreenshot.js:168 Drawing developable area boundaries with: {type: 'FeatureCollection', hasFeatures: 1, isArray: false}
contextScreenshot.js:177 Drawing 1 developable areas from FeatureCollection
contextScreenshot.js:180 Drawing developable area 0
contextScreenshot.js:488 Converting canvas to image...
contextScreenshot.js:490 Canvas conversion complete: 