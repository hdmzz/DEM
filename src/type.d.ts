export type	BboxType = {
	feature: {
		type: string;
		geometry: {
			properties: {};
			type: string;
			coordinates: [number[][]];
		};
	};
	northWest: number[];
	southEast: number[];
};

export type	PolygonFeature = {
	type: string;
	geometry: {
		properties: {};
		type: string;
		coordinates: [number[][]];
	};
};

export interface	GeoJSONFeatureCollection {
	type: "FeatureCollection";
	features: GeoJSONFeature[];
}

export interface	GeoJSONFeature {
	type: "Feature";
	id: string;
	geometry: GeoJSONGeometry;
	geometry_name: string;
	properties: GeoJSONProperties;
	bbox: [number, number, number, number];
}

export interface	GeoJSONGeometry {
	type: "MultiPolygon";
	coordinates: number[][][][];
}

export interface	GeoJSONProperties {
	cleabs: string;
	nature: string;
	usage_1: string;
	usage_2: string;
	construction_legere: boolean;
	etat_de_l_objet: string;
	date_creation: string;
	date_modification: string;
	date_d_apparition: string;
	date_de_confirmation: string | null;
	sources: string | null;
	identifiants_sources: string;
	methode_d_acquisition_planimetrique: string;
	methode_d_acquisition_altimetrique: string;
	precision_planimetrique: number;
	precision_altimetrique: number;
	nombre_de_logements: number;
	nombre_d_etages: number;
	materiaux_des_murs: string;
	materiaux_de_la_toiture: string;
	hauteur: number;
	altitude_minimale_sol: number;
	altitude_minimale_toit: number;
	altitude_maximale_toit: number;
	altitude_maximale_sol: number;
	origine_du_batiment: string;
	appariement_fichiers_fonciers: string;
	identifiants_rnb: string;
}
