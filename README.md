ol_dem
======
電子国土の標高タイルをOpenlayersで利用できるようにOpenlayersを拡張しました。

動作確認
------
http://www.ecoris.co.jp/map/ol_dem/map.html
標高タイルが表示されるのは、今のところデータ提供されているレベル14のみです。

設置
------
ol_demフォルダをwebサーバーに置いた後に、proxy.cgiに実行権限を与えてCGIが動作するようにする必要があります。（CORS制限のためProxyを有効にする）
ローカルでの確認の場合は、js/base.jsの一行目をコメントアウトして、google chromeを起動する際に"--disable-web-security"を付けるとCORS制限が解除され標高タイルを取得できます。(セキュリティが甘くなっているので注意してください。)

説明
------
以下のクラスを追加しました。UTFGrid.jsを流用したものなので、使い方はだいたい同じです。
- otm/Control/DEM.js  
- otm/Tile/DEM.js

TileクラスのDEM.jsで標高タイルを電子国土のサイトから取得し、標高、傾斜、傾斜方位を算出。ControlクラスのDEM.jsで算出した値を呼び出す。
また、標高値から陰影起伏画像を作成しタイルとして表示させる。

関連情報
--------
http://portal.cyberjapan.jp/portalsite/info/dem.html

  
ライセンス
----------
Openlayersと同じライセンスです。


TODO
----------
- キャッシュとかできるといいかも。
