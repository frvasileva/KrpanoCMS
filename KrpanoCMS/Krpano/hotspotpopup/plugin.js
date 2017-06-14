function krpanoplugin () {
	
	// the krpano and plugin interface objects
	var krpano;
	var plugin;
	var pluginPath;
	var layers = [];
	var api = {
		isAdmin: false,
		fetch: function () {},
		save: function () {},
		delete: function () {}
	}
	
	// registerplugin - startup point for the plugin (required)
	// - krpanointerface = krpano interface object
	// - pluginpath = the fully qualified plugin name (e.g. "plugin[name]")
	// - pluginobject = the xml plugin object itself
	this.registerplugin = function (krpanointerface, pluginpath, pluginobject) {
		krpano = krpanointerface;
		plugin = pluginobject;

		pluginPath = plugin.url.split('plugin.js')[0];
		krpano.events.onclick = _handleClick.bind(this);

		_loadConfiguration();
		_loadStyles();
		_loadHotspots();
	};

	// unloadplugin - exit point for the plugin (optionally)
	// - will be called from krpano when the plugin will be removed
	// - everything that was added by the plugin should be removed here
	this.unloadplugin = function () {
		plugin = null;
		krpano = null;
		layers = null;
		i = 0;
		krpano.events.onclick = null;
	};

	function _loadConfiguration () {
		if (window.stuff) {
			api.isAdmin = stuff.admin;
			api.fetch = typeof stuff.fetch == 'function' ? stuff.fetch : api.fetch;
			api.save = typeof stuff.save == 'function' ? stuff.save : api.save;
			api.delete = typeof stuff.delete == 'function' ? stuff.delete : api.delete;
		} else {
			console.error('Invalid configuration');
		}
	}
	
	function _loadStyles () {
		var styleTag = document.createElement('link');
		styleTag.setAttribute('rel', 'stylesheet');
		styleTag.setAttribute('href', pluginPath + 'plugin.css');
		plugin.sprite.appendChild(styleTag);
	}

	function _loadHotspots () {
		api.fetch(function (results) {
			results.map(function (item, index) {
				item.name = 'hotspot-' + index;
				_createHotspot(item);
			});
		});
	}
	
	function _createHotspot (data) {
		var hotspot = krpano.addhotspot(data.name);
		hotspot.id = data.id;
		hotspot.atv = data.atv;
		hotspot.ath = data.ath;
		hotspot.content = data.content;
		hotspot.distorted = true;
		hotspot.zorder = 10;
		hotspot.url = pluginPath + 'pin.png';
		hotspot.onclick = _openPopup.bind(this, hotspot);
		return hotspot;
	}

	function _hotspotToDTO (hotspot) {
		return {
	 		id: hotspot.id,
	 		ath: hotspot.ath,
	 		atv: hotspot.atv,
	 		content: hotspot.content
	 	};
	}
	
	function _openPopup (hotspot) {
		_closeAllPopups();
		krpano.call("looktohotspot(" + hotspot.name + ")");
		hotspot.zorder = 20;
		
		var layer = krpano.addlayer(hotspot.name);
		layer.type = 'text';
		layer.parent = hotspot.getfullpath();
		layers.push(layer);
		
		var popup = document.createElement('div');
		popup.classList.add('popup');
		_addPopupContent(popup, layer);
		layer.sprite.appendChild(popup);
	}
	
	function _closePopup (layer) {
		var hotspot = krpano.get(layer.parent);
		layers.splice(layers.indexOf(layer), 1);
		krpano.removelayer(layer.name);
		hotspot.zorder = 10;
		if (!hotspot.content) {
			krpano.removehotspot(hotspot.name);
		}
	}
	
	function _closeAllPopups () {
		layers.map(_closePopup);
	}

	function _addPopupContent (popup, layer) {
		var hotspot = krpano.get(layer.parent);
		if (api.isAdmin) {
			var field = document.createElement('textarea');
			field.classList.add('popup-field');
			field.value = hotspot.content;
			popup.appendChild(field);
			_addPopupButton(popup, 'Save', _saveHotspot.bind(null, layer, field));
			_addPopupButton(popup, 'Cancel', _closePopup.bind(null, layer));
			if (field.value) {
				_addPopupButton(popup, 'Delete', _deleteHotspot.bind(null, layer));
			}
		} else {
			popup.innerHTML = hotspot.content;
		}
	}

	function _addPopupButton (popup, name, action) {
		var button = document.createElement('button');
		button.classList.add('popup-' + name.toLowerCase());
		button.innerText = name;
		button.onclick = action;
		popup.appendChild(button);
	}

	function _saveHotspot (layer, field) {
		var hotspot = krpano.get(layer.parent);
		hotspot.content = field.value;
	 	api.save(_hotspotToDTO(hotspot), function (recordId) {
	 		hotspot.id = hotspot.id || recordId;
	 	});
	 	_closePopup(layer);
	}

	function _deleteHotspot (layer) {
		var hotspot = krpano.get(layer.parent);
		hotspot.content = '';
	 	api.delete(hotspot.id);
	 	_closePopup(layer);
	}
	
	function _handleClick () {
		if (layers.length) {
			_closeAllPopups();
			return;
		}
		if (!api.isAdmin) return;
		var coords = krpano.screentosphere(krpano.mouse.x, krpano.mouse.y);
		var hotspotData = {
			name: 'click' + Math.round(krpano.timertick),
			ath: coords.x,
			atv: coords.y,
			content: ''
		};
		var hotspot = _createHotspot(hotspotData);
		_openPopup(hotspot);
	}
}