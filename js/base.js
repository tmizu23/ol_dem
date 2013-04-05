OpenLayers.ProxyHost = "proxy.cgi?url="; // キャッシュのときに必要
cjp_layer = new webtis.Layer.BaseMap("電子国土");
cjp_layer.updateAttribution = function () {
    this.attribution = "<img src='js/img/cjpicon.png'/>"
};

var map = new OpenLayers.Map('map', {
    layers: [cjp_layer],
    center: new OpenLayers.LonLat(137.647, 36.342).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")),
    zoom: 14,
    projection: new OpenLayers.Projection("EPSG:900913")
});

map.addControl(new OpenLayers.Control.LayerSwitcher());
map.addControl(new OpenLayers.Control.TouchNavigation({
    dragPanOptions: {
        enableKinetic: true
    },
    defaultDblClick: function () {}
}));

dem_layer = new OpenLayers.Layer.XYZ("標高タイル", "http://cyberjapandata2.gsi.go.jp/general/dem/data2/DEM10/LOD${z}/${x}/${x}-${y}-${z}.txt", {
    isBaseLayer: false,
    opacity: 0.6,
    attribution: "",
    shade: true,
    tileClass: otm.Tile.DEM
});
map.addLayer(dem_layer);

map.addControl(new otm.Control.DEM({
    layers: [dem_layer],
    handlerMode: "move",
    callback: function (infoLookup, lonlat, pixel) {
        if (infoLookup && map.getZoom() == 14) {
            for (var idx in infoLookup) {
                var elev = infoLookup[idx].elevation;
                var slope = infoLookup[idx].slope;
                //var aspect = infoLookup[idx].aspect;

                var aspect = parseInt((infoLookup[idx].aspect + 22.5) / 45);

                if (aspect < 1) {
                    aspect = "N";
                } else if (aspect < 2) {
                    aspect = "NE";
                } else if (aspect < 3) {
                    aspect = "E";
                } else if (aspect < 4) {
                    aspect = "SE";
                } else if (aspect < 5) {
                    aspect = "S";
                } else if (aspect < 6) {
                    aspect = "SW";
                } else if (aspect < 7) {
                    aspect = "W";
                } else if (aspect < 8) {
                    aspect = "NW";
                } else {
                    aspect = "N";
                }
                document.getElementById("tooltip").style.display = "block";
                document.getElementById("tooltip").innerHTML = "標高：<strong>" + elev + "</strong><br/>傾斜角度：<strong>" + slope + "</strong><br/>傾斜方位：<strong>" + aspect + "</strong>";
                return

            }
        } else {
            document.getElementById("tooltip").style.display = "none";
        }
    }
}));