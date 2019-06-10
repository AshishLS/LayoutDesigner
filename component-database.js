
var ComponentDB = {
	map: null,

	setMapValues: function () {
		this.map = new Map;
		this.map.set("Turbine", { "file": "", "width": 40, "height": 40, "selectionOrder": 1 });
		this.map.set("GSUT", { "file": "", "width": 30, "height": 30, "selectionOrder": 1 });
		this.map.set("FirePump", { "file": "", "width": 40, "height": 40, "selectionOrder": 1 });
		this.map.set("Compressor", { "file": "", "width": 30, "height": 30, "selectionOrder": 1 });
		this.map.set("Whatsapp", { "file": "", "width": 80, "height": 40, "selectionOrder": 1 });
		this.map.set("Layout-1", { "file": "", "width": 240, "height": 170, "selectionOrder": 5 });
	},

	getComponentData: function (componetName) {
		if (this.map) {
			return this.map.get(componetName);
		}
	},
}

ComponentDB.setMapValues();
