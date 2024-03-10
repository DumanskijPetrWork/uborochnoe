// Подключение каталогов
export const config = {
	SITE_URL: "https://biefe.ru/",
	CATALOGUES: [
		{
			name: "bffarinelli",
			url: "https://bffarinelli.com/product/",
			exceptions: new Set([
				// "https://bffarinelli.com/product/aksessuary/",
			]),
			categories: new Map([
				['Парогенераторы для чистки обуви', 'Парогенераторы для обуви'],
				['Аксессуары', 'Аксессуары и запчасти'],
				['Парогенераторы для дома', 'Парогенераторы>Парогенераторы для дома'],
				['Парогенераторы для клининга', 'Парогенераторы>Парогенераторы для клининга'],
				['Парогенераторы для дезинфекции', 'Парогенераторы>Парогенераторы для дезинфекции'],
				['Парогенераторы для пищевого/промышленного производства', 'Парогенераторы>Парогенераторы для пищевого/промышленного производства'],
				['Парогенераторы для автомойки и СТО', 'Парогенераторы>Парогенераторы для автомойки и СТО'],
				['https://bffarinelli.com/product/dlya-klininga/ariasana-bf65100000/', 'Парогенераторы для кондиционеров'],
				['https://bffarinelli.com/product/dlya-avtomoyki-i-sto/avtofen-carfon-bfcarffr/', 'Фены для сушки мебели'],
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
			categories: new Map([
				['Промышленные парогенераторы', 'Парогенераторы с утюгом'],
				['Запчасти Bieffe', 'Аксессуары и запчасти>Запчасти Bieffe'],
				['Приспособления и аксессуары для ВТО', 'Аксессуары и запчасти>Приспособления и аксессуары для ВТО'],
				['Чистящие средства', 'Аксессуары и запчасти>Чистящие средства'],
				['https://www.transmetall.ru/catalog/katalog_oborudovaniya/oborudovaniye_dlya_vto/oborudovaniye_dlya_khimchistki_odezhdy_i_obuvi/detail/cushilnyj_stol_dlya_bieffe_scarpa_vapor_bf4250000s_obuvnoj_23606', 'Парогенераторы для обуви'],
			]),
			SKUs: new Map([
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_raz_yem_dlya_utyuga_tapi_12x26_2p_t_10a_250v_chernyy_5126', 'TAPI'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_chekhol_kolodki_bf011_dlya_glazheniya_rukavov_ar11l_br6l_31918', 'AR11L+BR6L'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_fiting_perekhodnik_dlya_utyuga_cv75_30137', 'CV75 (R069)'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_rozetka_ar130_5_i_kontaktnaya_19143', 'AR130'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_paroklapan_v_sbore_c18g_olab_10000_29196', 'C18G/OL'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/korpus_k_parogeneratoru_bf073_cof1031_27860', 'COF1031_'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/korpus_k_parogeneratoru_bf072_cof1041_27859', 'COF1041_'],
				['https://www.transmetall.ru/catalog/katalog_zapchastey/zapchasti/zapchasti_dlya_vto/zapchasti_bieffe/detail/bieffe_bak_dlya_boylera_2_8_l_c15av3_dlya_stola_bf205_12310', 'BF205 (COB1124)'],
			]),
		},
	],
}