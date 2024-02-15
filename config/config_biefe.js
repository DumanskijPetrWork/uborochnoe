// Подключение каталогов
export const config = {
	SITE_URL: "https://biefe.ru/",
	CATALOGUES: [
		{
			name: "bffarinelli",
			url: "https://bffarinelli.com/sitemap/",
			exceptions: new Set([
				"/product/aksessuary/",
			]),
			SKUs: new Map([
				['https://bffarinelli.com/product/dlya-klininga/steam-3000-4-5-kvt-bf420pl/', 'BF420PL'],
			]),
		},
		{
			name: "transmetall",
			url: "https://www.transmetall.ru/catalog/all-bieffe?limit=30",
			exceptions: new Set([
			]),
			SKUs: new Map([
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_raz_yem_dlya_utyuga_tapi_12x26_2p_t_10a_250v_chernyy_5126', 'TAPI'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_chekhol_kolodki_bf011_dlya_glazheniya_rukavov_ar11l_br6l_31918', 'BF011'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_fiting_perekhodnik_dlya_utyuga_cv75_30137', 'R069'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_rozetka_ar130_5_i_kontaktnaya_19143', 'AR130'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_paroklapan_v_sbore_c18g_olab_10000_29196', 'C18G/OL'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_chekhol_kolodki_bf011_dlya_glazheniya_rukavov_ar11l_br6l_31918', 'AR11L+BR6L'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/korpus_k_parogeneratoru_bf073_cof1031_27860', 'COF1031_'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/korpus_k_parogeneratoru_bf072_cof1041_27859', 'COF1041_'],
			]),
		},
	],
}