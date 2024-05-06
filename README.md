## Инструкция по установке

1. Скачать последний релиз (2.1.0)
2. Установить NodeJS:

 ```bash
 Node.js
 ```

3. Открыть директорию программы в терминале
4. Установить пакеты

 ```bash
 npm i
 ```

6. Раскомментировать необходимые парсеры в файле ```config``` -> ```parsers.js``` для их подключения
7. Указать настройки для каждого парсера в файлах ```config``` -> ```config_*parser_name*.js```
8. Запустить основной скрипт

 ```bash
 npm run main
 ```

10. Программа создаст директорию dist с каталогами товаров и медиафайлами

## Добавление вариаций товаров из каталога

1. Поместить файл вариаций ```.xlsx``` в директорию ```dist/../variations``` нужного каталога
2. Запустить скрипт вариаций

 ```bash
 npm run variations
 ```

4. Программа создаст файл ```*catalogue_name*_with_variations.xlsx```
