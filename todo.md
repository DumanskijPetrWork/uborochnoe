# Дополнительный функционал

- app-root-path

- Искать любые изменения в товаре, если есть - вносить в таблицу измененных/новых товаров

## axios.js + media.js

- axios заменяем на fetch
- httpsAgent: new https.Agent({ keepAlive: true }) ?
- Добавить очередь на загрузку файлов. Непрерывное соединение обрабатывает очередь, при успешной загрузке убирая из нее файлы. При падении соединения оно возобновляется.

## Abstract parser

- На выходе url проверяется на список исключений
- Добавить или заменить значение поля для каждого товара через конфиг
- - Загрузки по отдельным товарам (с ручным указанием категорий), по отдельным категориям
- - Доработать систему замены имен категорий
- - Проверка на повтор имени категории при добавлении новой
- Аксессоры для AbstractParser
- передать ограничение limit из конфига

## database.js

- Опция записи нескольких парсеров в одну таблицу
