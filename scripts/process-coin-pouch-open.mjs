/**
 * Мешок coin-pouch-open.png редактируется вручную (фон, окно).
 * Скрипт намеренно ничего не меняет.
 *
 * После правки PNG подгоните зону монет в character.css:
 *   .coin-sack--illustrated .coin-sack-belly
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, '..', 'public', 'img', 'ui', 'coin-pouch-open.png');

console.log('process-coin-pouch-open: пропуск — PNG не трогаем, правьте вручную.');
console.log(target);
