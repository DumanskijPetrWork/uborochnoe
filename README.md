# Инструкция по установке

1. Скачать последний релиз (2.1.0)
2. Установить Node.js
3. Открыть директорию программы в терминале
4. Установить пакеты (npm i)
5. Раскомментировать необходимые парсеры в файле config -> parsers.js для их подключения
6. Указать настройки для каждого парсера в файлах config -> config_*parser_name*.js
7. Запустить основной скрипт (npm run main)
8. Программа создаст директорию dist с каталогами товаров и медиафайлами

## Добавление вариаций товаров из каталога

1. Поместить файл вариаций .xlsx в директорию dist -> ... ->  variations нужного каталога
2. Запустить скрипт вариаций (npm run variations)
3. Программа создаст файл *catalogue_name*_with_variations.xlsx
