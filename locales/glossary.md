# Picture Passport — the words, in every language

One set of terms for the game's text (`locales/<lang>.json`), the store page (Art) and the
friend-challenge lines in config (Server), so a player reads the same word everywhere. Agreed
2026-10-29 for the first translation pass (release review GSR-002, -003, -004). A later pass
translates only what changed (the `gemctl:localization` skill), with these words.

Rules every language follows:

- **"Picture Passport" stays in English**, in every language: it is the game's name.
- **"Level", never "Board"**, for what the player plays (the creator, 2026-10-29, GSR-016).
- **Place names take the language's usual form** (Mont-Saint-Michel, モン・サン＝ミシェル, водопады Игуасу…).
- **A name dropped into a sentence stays in its dictionary form** (Polish, Russian, Turkish…): build
  the sentence around it ("Путешествие «{{trip}}»", "Podróż: {{trip}}") rather than declining a
  placeholder that cannot change.
- **Plural forms follow the language** (i18next keys `_one`, `_few`, `_many`, `_other`): Polish and
  Russian need `_few` and `_many`; Japanese, Korean and Chinese take `_other` only.

## Core terms

| English | de | es | fr | it | ja | ko | pl | pt-BR | ru | tr | zh-Hans |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Level 27 | Level 27 | Nivel 27 | Niveau 27 | Livello 27 | レベル27 | 레벨 27 | Poziom 27 | Nível 27 | Уровень 27 | Seviye 27 | 第27关 |
| level | Level | nivel | niveau | livello | レベル | 레벨 | poziom | nível | уровень | seviye | 关卡 |
| daily puzzle | Tagesrätsel | puzle diario | puzzle du jour | puzzle del giorno | デイリーパズル | 데일리 퍼즐 | łamigłówka dnia | quebra-cabeça do dia | головоломка дня | günün bulmacası | 每日谜题 |
| move / moves | Zug / Züge | movimiento(s) | coup(s) | mossa / mosse | 手 (12手) | 수 (12수) | ruch / ruchy / ruchów | jogada(s) | ход / хода / ходов | hamle | 步 (12步) |
| Hint | Tipp | Pista | Indice | Suggerimento | ヒント | 힌트 | Podpowiedź | Dica | Подсказка | İpucu | 提示 |
| Undo | Rückgängig | Deshacer | Annuler | Annulla | 元に戻す | 되돌리기 | Cofnij | Desfazer | Отмена | Geri Al | 撤销 |
| Shuffle | Mischen | Mezclar | Mélanger | Mescola | シャッフル | 섞기 | Tasuj | Embaralhar | Перемешать | Karıştır | 洗牌 |
| Restart | Neustart | Reiniciar | Recommencer | Ricomincia | やり直す | 다시 시작 | Od nowa | Reiniciar | Заново | Yeniden başla | 重新开始 |
| helpers (Hint, Undo, Shuffle) | Hilfen | ayudas | bonus | aiuti | アイテム | 아이템 | pomoce | ajudas | бонусы | yardımlar | 道具 |
| Coins (the Arcade's) | Münzen | monedas | pièces | monete | コイン | 코인 | monety | moedas | монеты | jeton | 金币 |
| Passport | Reisepass | pasaporte | passeport | passaporto | パスポート | 여권 | paszport | passaporte | паспорт | pasaport | 护照 |
| stamp | Stempel | sello | tampon | timbro | スタンプ | 스탬프 | pieczątka | carimbo | штамп | damga | 印章 |
| trip | Reise | viaje | voyage | viaggio | 旅 | 여행 | podróż | viagem | путешествие | gezi | 旅行 |
| postcard | Postkarte | postal | carte postale | cartolina | 絵はがき | 엽서 | pocztówka | cartão-postal | открытка | kartpostal | 明信片 |
| Souvenir (bonus level) | Souvenir | Recuerdo | Souvenir | Souvenir | おみやげ | 기념품 | Pamiątka | Lembrança | Сувенир | Hatıra | 纪念品 |
| sticker (a Souvenir's, in the passport) | Sticker | pegatina | autocollant | adesivo | ステッカー | 스티커 | naklejka | adesivo | наклейка | çıkartma | 贴纸 |
| Daily Suitcase | Tageskoffer | Maleta diaria | Valise du jour | Valigia del giorno | デイリースーツケース | 데일리 여행 가방 | Walizka dnia | Mala diária | Чемодан дня | Günlük Bavul | 每日行李箱 |
| suitcase | Koffer | maleta | valise | valigia | スーツケース | 여행 가방 | walizka | mala | чемодан | bavul | 行李箱 |
| Hard | Schwer | Difícil | Difficile | Difficile | むずかしい | 어려움 | Trudny | Difícil | Сложный | Zor | 困难 |
| Super hard | Superschwer | Superdifícil | Très difficile | Difficilissimo | 超むずかしい | 매우 어려움 | Bardzo trudny | Superdifícil | Очень сложный | Çok zor | 超难 |
| par (the moves to aim for) | Par | Par | Par | Par | パー | 기준 | Norma | Meta | Норма | Hedef | 目标 |
| table (the scene behind the cards) | Tisch | mesa | table | tavolo | テーブル | 테이블 | stół | mesa | стол | masa | 桌面 |
| Challenge a friend | Freund herausfordern | Reta a un amigo | Défier un ami | Sfida un amico | フレンドに挑戦 | 친구에게 도전 | Wyzwij znajomego | Desafie um amigo | Вызов другу | Arkadaşına meydan oku | 挑战好友 |
| Share | Teilen | Compartir | Partager | Condividi | シェア | 공유 | Udostępnij | Compartilhar | Поделиться | Paylaş | 分享 |

## The trips

`trip.<id>` is the trip's title (the passport page, home's itinerary); `tripPlace.t1` is the
place alone, for a sentence or a short label ("Level 8 · America"). Every other trip's title is its place.

| id | English | de | es | fr | it | ja | ko | pl | pt-BR | ru | tr | zh-Hans |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t1 | Travel America | Reise durch Amerika | Viaje por Estados Unidos | Voyage aux États-Unis | Viaggio in America | アメリカの旅 | 미국 여행 | Podróż po Ameryce | Viagem pelos Estados Unidos | Путешествие по Америке | Amerika Gezisi | 美国之旅 |
| t1 place | America | Amerika | Estados Unidos | États-Unis | America | アメリカ | 미국 | Ameryka | Estados Unidos | Америка | Amerika | 美国 |
| t2 | Japan | Japan | Japón | Japon | Giappone | 日本 | 일본 | Japonia | Japão | Япония | Japonya | 日本 |
| t3 | Italy | Italien | Italia | Italie | Italia | イタリア | 이탈리아 | Włochy | Itália | Италия | İtalya | 意大利 |
| t4 | American West | Amerikanischer Westen | Oeste americano | Ouest américain | Ovest americano | アメリカ西部 | 미국 서부 | Zachód USA | Oeste americano | Американский Запад | Amerikan Batısı | 美国西部 |
| t5 | France | Frankreich | Francia | France | Francia | フランス | 프랑스 | Francja | França | Франция | Fransa | 法国 |
| t6 | Canada | Kanada | Canadá | Canada | Canada | カナダ | 캐나다 | Kanada | Canadá | Канада | Kanada | 加拿大 |
| t7 | Argentina | Argentinien | Argentina | Argentine | Argentina | アルゼンチン | 아르헨티나 | Argentyna | Argentina | Аргентина | Arjantin | 阿根廷 |
| t8 | Australia | Australien | Australia | Australie | Australia | オーストラリア | 호주 | Australia | Austrália | Австралия | Avustralya | 澳大利亚 |
| t9 | South Africa | Südafrika | Sudáfrica | Afrique du Sud | Sudafrica | 南アフリカ | 남아프리카 | Afryka Południowa | África do Sul | Южная Африка | Güney Afrika | 南非 |
| t10 | UK & Ireland | Großbritannien & Irland | Reino Unido e Irlanda | Royaume-Uni et Irlande | Regno Unito e Irlanda | イギリスとアイルランド | 영국과 아일랜드 | Wielka Brytania i Irlandia | Reino Unido e Irlanda | Великобритания и Ирландия | Birleşik Krallık ve İrlanda | 英国和爱尔兰 |
