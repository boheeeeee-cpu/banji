/**
 * 네이버 지도 마커·동선 로직 (index.html / map-embed.html 공용)
 */
(function (global) {
  var GEOJE_CENTER = { lat: 34.8805, lng: 128.621, zoom: 11 };
  var map = null;
  var markers = {};
  var polyline = null;
  var currentRouteRequest = 0;

  function postToApp(payload) {
    var msg = JSON.stringify(payload);
    if (global.ReactNativeWebView) {
      global.ReactNativeWebView.postMessage(msg);
    } else if (global.parent && global.parent !== global) {
      global.parent.postMessage(msg, '*');
    } else {
      // Web (same window): dispatch as MessageEvent so React listener picks it up
      global.dispatchEvent(new MessageEvent('message', { data: msg }));
    }
  }

  function createMarkerContent(order) {
    var el = document.createElement('div');
    el.className = 'banji-marker-pin';
    el.innerHTML = '<span>' + order + '</span>';
    return el;
  }

  function createPlaceMarkerContent(name) {
    var el = document.createElement('div');
    el.className = 'banji-marker-dot';
    el.title = name;
    return el;
  }

  function clearMarkers() {
    Object.keys(markers).forEach(function (id) {
      markers[id].setMap(null);
      delete markers[id];
    });
  }

  function clearPolyline() {
    if (polyline) {
      polyline.setMap(null);
      polyline = null;
    }
  }

  function drawPolyline(path) {
    clearPolyline();
    polyline = new naver.maps.Polyline({
      map: map,
      path: path,
      strokeColor: '#FF6B8A',
      strokeWeight: 5,
      strokeOpacity: 0.9,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });
  }

  function sendRouteDuration(seconds) {
    postToApp({ type: 'routeInfo', durationSeconds: seconds });
    global.dispatchEvent(new CustomEvent('banji-route-duration', { detail: { seconds: seconds } }));
  }

  function fetchRoadRoute(places) {
    var waypoints = places.map(function (p) { return p.lng + ',' + p.lat; }).join(';');
    var url = 'https://router.project-osrm.org/route/v1/driving/' + waypoints + '?overview=full&geometries=geojson';
    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          var route = data.routes[0];
          return {
            path: route.geometry.coordinates.map(function (coord) {
              return new naver.maps.LatLng(coord[1], coord[0]);
            }),
            durationSeconds: route.duration,
          };
        }
        return null;
      })
      .catch(function () { return null; });
  }

  function fitBounds(coords) {
    if (!coords.length || !map) return;
    if (coords.length === 1) {
      map.setCenter(coords[0]);
      map.setZoom(14);
      return;
    }
    var bounds = new naver.maps.LatLngBounds(coords[0], coords[0]);
    for (var i = 1; i < coords.length; i++) {
      bounds.extend(coords[i]);
    }
    map.fitBounds(bounds, { top: 80, right: 40, bottom: 200, left: 40 });
  }

  function init(containerId) {
    var el = document.getElementById(containerId);
    if (!el || !global.naver || !global.naver.maps) {
      return false;
    }

    map = new naver.maps.Map(el, {
      center: new naver.maps.LatLng(GEOJE_CENTER.lat, GEOJE_CENTER.lng),
      zoom: GEOJE_CENTER.zoom,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
    });

    postToApp({ type: 'ready' });
    global.dispatchEvent(new Event('banji-naver-map-ready'));
    return true;
  }

  function update(payload) {
    if (!map || !global.naver) return;

    var routeIds = payload.routeIds || [];
    var placesById = {};
    (payload.places || []).forEach(function (p) {
      placesById[p.id] = p;
    });

    clearMarkers();
    clearPolyline();

    var routeIdSet = {};
    routeIds.forEach(function (id) { routeIdSet[id] = true; });

    var markerCoords = [];
    var routePlaces = [];

    // 전체 장소 — 작은 점 마커
    (payload.places || []).forEach(function (place) {
      if (routeIdSet[place.id]) return; // 동선 장소는 아래에서 따로 처리
      var position = new naver.maps.LatLng(place.lat, place.lng);
      var marker = new naver.maps.Marker({
        position: position,
        map: map,
        title: place.name,
        icon: {
          content: createPlaceMarkerContent(place.name),
          anchor: new naver.maps.Point(6, 6),
        },
        zIndex: 1,
      });
      naver.maps.Event.addListener(marker, 'click', function () {
        postToApp({ type: 'markerPress', placeId: place.id });
      });
      markers[place.id] = marker;
    });

    // 동선 장소 — 번호 마커
    routeIds.forEach(function (id, index) {
      var place = placesById[id];
      if (!place) return;

      var position = new naver.maps.LatLng(place.lat, place.lng);
      markerCoords.push(position);
      routePlaces.push({ lat: place.lat, lng: place.lng });

      var marker = new naver.maps.Marker({
        position: position,
        map: map,
        title: place.name,
        icon: {
          content: createMarkerContent(index + 1),
          anchor: new naver.maps.Point(16, 32),
        },
        zIndex: 10,
      });

      naver.maps.Event.addListener(marker, 'click', function () {
        postToApp({ type: 'markerPress', placeId: id });
      });

      markers[id] = marker;
    });

    if (markerCoords.length > 0) {
      fitBounds(markerCoords);
    }

    if (routePlaces.length >= 2) {
      // 직선으로 즉시 표시 후 실제 도로 경로로 교체
      drawPolyline(markerCoords);
      var requestId = ++currentRouteRequest;
      fetchRoadRoute(routePlaces).then(function (result) {
        if (requestId !== currentRouteRequest) return; // 이전 요청 무시
        if (result && result.path && result.path.length > 0) {
          drawPolyline(result.path);
          sendRouteDuration(result.durationSeconds);
        }
      });
    } else {
      sendRouteDuration(null);
    }
  }

  global.BanjiMapBridge = {
    init: init,
    update: update,
    isReady: function () {
      if (!map) return false;
      var el = map.getElement ? map.getElement() : null;
      return el ? document.body.contains(el) : false;
    },
  };

  global.updateBanjiMap = update;

  // iframe 환경: 부모 창에서 오는 메시지 수신
  global.addEventListener('message', function (event) {
    try {
      var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (msg.type === 'probe') {
        if (global.BanjiMapBridge.isReady()) {
          postToApp({ type: 'ready' });
        }
      } else if (msg.type === 'banjiUpdate' && msg.payload) {
        update(msg.payload);
      }
    } catch (e) { /* ignore */ }
  });
})(window);
