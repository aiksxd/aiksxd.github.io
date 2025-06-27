<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <title>言·久违的五子棋盘</title>

<?php
function status($start){
	$turn = $start;
}
//$fpath=iconv('UTF-8','GB2312',"situation.csv"); 
$pos=fopen("position.csv","r+") or exit("获取服务器文件失败!");
$col=fopen("color.csv","r+") or exit("获取服务器文件失败!");
$pos=fgetcsv($pos);
$col=fgetcsv($col);
$cursor=array(8,8);
function up(){
	$x = $cursor[0];
	$y = $cursor[1] + 1;
	$cursor=array($x,$y);
}
function sure(){
//	if()
	//file_put_contents("situation.csv", "$position", FILE_APPEND);
}
?>
    <!-- css -->
    <style type="text/css">
		.start{
			width:60px;
			height:60px;
		}
     #container {
        width: 531px;
        height: 645px;
        margin: 0 auto;
        border: 1px solid blue;
        background:url(qipan.jpg) no-repeat;
        padding-top: 0px;
        padding-left: 5px;
        }
       td{
        width: 40px;
        height:33px;
        }
    table{
        border-collapse: collapse;
        width: 525px;
        height: 465px;
  		   }
	 #a0201{background:url(black.png);}
<?php
	$n=0;
	while($n < count($pos)){
	echo "#$pos[$n]{background:url($col[$n].png);}";
	$n++;
			}//循环输出所有的值
		?>
    </style>
    <!-- css ends -->
    <!-- script-->
    <script src="fcqi.js"></script>
    <!-- script ends -->
</head>
<body>
   <!-- Container -->
    <div id="container">
    <!-- table model -->
     <table>
        <tr>
            <td class="place" id="a0101">&nbsp</td>
            <td class="place" id="a0102">&nbsp</td>
            <td class="place" id="a0103">&nbsp</td>
            <td class="place" id="a0104">&nbsp</td>
            <td class="place" id="a0105">&nbsp</td>
            <td class="place" id="a0106">&nbsp</td>
            <td class="place" id="a0107">&nbsp</td>
            <td class="place" id="a0108">&nbsp</td>
            <td class="place" id="a0109">&nbsp</td>
            <td class="place" id="a0110">&nbsp</td>
            <td class="place" id="a0111">&nbsp</td>
            <td class="place" id="a0112">&nbsp</td>
            <td class="place" id="a0113">&nbsp</td>
            <td class="place" id="a0114">&nbsp</td>
            <td class="place" id="a0115">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a0201">&nbsp</td>
            <td class="place" id="a0202">&nbsp</td>
            <td class="place" id="a0203">&nbsp</td>
            <td class="place" id="a0204">&nbsp</td>
            <td class="place" id="a0205">&nbsp</td>
            <td class="place" id="a0206">&nbsp</td>
            <td class="place" id="a0207">&nbsp</td>
            <td class="place" id="a0208">&nbsp</td>
            <td class="place" id="a0209">&nbsp</td>
            <td class="place" id="a0210">&nbsp</td>
            <td class="place" id="a0211">&nbsp</td>
            <td class="place" id="a0212">&nbsp</td>
            <td class="place" id="a0213">&nbsp</td>
            <td class="place" id="a0214">&nbsp</td>
            <td class="place" id="a0215">&nbsp</td>
        </tr>
        <tr>
					<td class="place" id="a0301">&nbsp</td>
            <td class="place" id="a0302">&nbsp</td>
            <td class="place" id="a0303">&nbsp</td>
            <td class="place" id="a0304">&nbsp</td>
            <td class="place" id="a0305">&nbsp</td>
            <td class="place" id="a0306">&nbsp</td>
            <td class="place" id="a0307">&nbsp</td>
            <td class="place" id="a0308">&nbsp</td>
            <td class="place" id="a0309">&nbsp</td>
            <td class="place" id="a0310">&nbsp</td>
            <td class="place" id="a0311">&nbsp</td>
            <td class="place" id="a0312">&nbsp</td>
            <td class="place" id="a0313">&nbsp</td>
            <td class="place" id="a0314">&nbsp</td>
            <td class="place" id="a0315">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a0401">&nbsp</td>
            <td class="place" id="a0402">&nbsp</td>
            <td class="place" id="a0403">&nbsp</td>
            <td class="place" id="a0404">&nbsp</td>
            <td class="place" id="a0405">&nbsp</td>
            <td class="place" id="a0406">&nbsp</td>
            <td class="place" id="a0407">&nbsp</td>
            <td class="place" id="a0408">&nbsp</td>
            <td class="place" id="a0409">&nbsp</td>
            <td class="place" id="a0410">&nbsp</td>
            <td class="place" id="a0411">&nbsp</td>
            <td class="place" id="a0412">&nbsp</td>
            <td class="place" id="a0413">&nbsp</td>
            <td class="place" id="a0414">&nbsp</td>
            <td class="place" id="a0415">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a0501">&nbsp</td>
            <td class="place" id="a0502">&nbsp</td>
            <td class="place" id="a0503">&nbsp</td>
            <td class="place" id="a0504">&nbsp</td>
            <td class="place" id="a0505">&nbsp</td>
            <td class="place" id="a0506">&nbsp</td>
            <td class="place" id="a0507">&nbsp</td>
            <td class="place" id="a0508">&nbsp</td>
            <td class="place" id="a0509">&nbsp</td>
            <td class="place" id="a0510">&nbsp</td>
            <td class="place" id="a0511">&nbsp</td>
            <td class="place" id="a0512">&nbsp</td>
            <td class="place" id="a0513">&nbsp</td>
            <td class="place" id="a0514">&nbsp</td>
            <td class="place" id="a0515">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a0601">&nbsp</td>
            <td class="place" id="a0602">&nbsp</td>
            <td class="place" id="a0603">&nbsp</td>
            <td class="place" id="a0604">&nbsp</td>
            <td class="place" id="a0605">&nbsp</td>
            <td class="place" id="a0606">&nbsp</td>
            <td class="place" id="a0607">&nbsp</td>
            <td class="place" id="a0608">&nbsp</td>
            <td class="place" id="a0609">&nbsp</td>
            <td class="place" id="a0610">&nbsp</td>
            <td class="place" id="a0611">&nbsp</td>
            <td class="place" id="a0612">&nbsp</td>
            <td class="place" id="a0613">&nbsp</td>
            <td class="place" id="a0614">&nbsp</td>
            <td class="place" id="a0615">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="0701">&nbsp</td>
            <td class="place" id="0702">&nbsp</td>
            <td class="place" id="0703">&nbsp</td>
            <td class="place" id="0704">&nbsp</td>
            <td class="place" id="0705">&nbsp</td>
            <td class="place" id="0706">&nbsp</td>
            <td class="place" id="0707">&nbsp</td>
            <td class="place" id="0708">&nbsp</td>
            <td class="place" id="0709">&nbsp</td>
            <td class="place" id="0710">&nbsp</td>
            <td class="place" id="0711">&nbsp</td>
            <td class="place" id="0712">&nbsp</td>
            <td class="place" id="0713">&nbsp</td>
            <td class="place" id="0714">&nbsp</td>
            <td class="place" id="0715">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="0801">&nbsp</td>
            <td class="place" id="0802">&nbsp</td>
            <td class="place" id="0803">&nbsp</td>
            <td class="place" id="0804">&nbsp</td>
            <td class="place" id="0805">&nbsp</td>
            <td class="place" id="0806">&nbsp</td>
            <td class="place" id="0807">&nbsp</td>
            <td class="place" id="0808">&nbsp</td>
            <td class="place" id="0809">&nbsp</td>
            <td class="place" id="0810">&nbsp</td>
            <td class="place" id="0811">&nbsp</td>
            <td class="place" id="0812">&nbsp</td>
            <td class="place" id="0813">&nbsp</td>
            <td class="place" id="0814">&nbsp</td>
            <td class="place" id="0815">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="0901">&nbsp</td>
            <td class="place" id="0902">&nbsp</td>
            <td class="place" id="0903">&nbsp</td>
            <td class="place" id="0904">&nbsp</td>
            <td class="place" id="0905">&nbsp</td>
            <td class="place" id="0906">&nbsp</td>
            <td class="place" id="0907">&nbsp</td>
            <td class="place" id="0908">&nbsp</td>
            <td class="place" id="0909">&nbsp</td>
            <td class="place" id="0910">&nbsp</td>
            <td class="place" id="0911">&nbsp</td>
            <td class="place" id="0912">&nbsp</td>
            <td class="place" id="0913">&nbsp</td>
            <td class="place" id="0914">&nbsp</td>
            <td class="place" id="0915">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="1001">&nbsp</td>
            <td class="place" id="1002">&nbsp</td>
            <td class="place" id="1003">&nbsp</td>
            <td class="place" id="1004">&nbsp</td>
            <td class="place" id="1005">&nbsp</td>
            <td class="place" id="1006">&nbsp</td>
            <td class="place" id="1007">&nbsp</td>
            <td class="place" id="1008">&nbsp</td>
            <td class="place" id="1009">&nbsp</td>
            <td class="place" id="1010">&nbsp</td>
            <td class="place" id="1011">&nbsp</td>
            <td class="place" id="1012">&nbsp</td>
            <td class="place" id="1013">&nbsp</td>
            <td class="place" id="1014">&nbsp</td>
            <td class="place" id="1015">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="1101">&nbsp</td>
            <td class="place" id="1102">&nbsp</td>
            <td class="place" id="1103">&nbsp</td>
            <td class="place" id="1104">&nbsp</td>
            <td class="place" id="1105">&nbsp</td>
            <td class="place" id="1106">&nbsp</td>
            <td class="place" id="1107">&nbsp</td>
            <td class="place" id="1108">&nbsp</td>
            <td class="place" id="1109">&nbsp</td>
            <td class="place" id="1110">&nbsp</td>
            <td class="place" id="1111">&nbsp</td>
            <td class="place" id="1112">&nbsp</td>
            <td class="place" id="1113">&nbsp</td>
            <td class="place" id="1114">&nbsp</td>
            <td class="place" id="1115">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="1201">&nbsp</td>
            <td class="place" id="1202">&nbsp</td>
            <td class="place" id="1203">&nbsp</td>
            <td class="place" id="1204">&nbsp</td>
            <td class="place" id="1205">&nbsp</td>
            <td class="place" id="1206">&nbsp</td>
            <td class="place" id="1207">&nbsp</td>
            <td class="place" id="1208">&nbsp</td>
            <td class="place" id="1209">&nbsp</td>
            <td class="place" id="1210">&nbsp</td>
            <td class="place" id="1211">&nbsp</td>
            <td class="place" id="1212">&nbsp</td>
            <td class="place" id="1213">&nbsp</td>
            <td class="place" id="1214">&nbsp</td>
            <td class="place" id="1215">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="1301">&nbsp</td>
            <td class="place" id="1302">&nbsp</td>
            <td class="place" id="1303">&nbsp</td>
            <td class="place" id="1304">&nbsp</td>
            <td class="place" id="1305">&nbsp</td>
            <td class="place" id="1306">&nbsp</td>
            <td class="place" id="1307">&nbsp</td>
            <td class="place" id="1308">&nbsp</td>
            <td class="place" id="1309">&nbsp</td>
            <td class="place" id="1310">&nbsp</td>
            <td class="place" id="1311">&nbsp</td>
            <td class="place" id="1312">&nbsp</td>
            <td class="place" id="1313">&nbsp</td>
            <td class="place" id="1314">&nbsp</td>
            <td class="place" id="1315">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="1401">&nbsp</td>
            <td class="place" id="1402">&nbsp</td>
            <td class="place" id="1403">&nbsp</td>
            <td class="place" id="1404">&nbsp</td>
            <td class="place" id="1405">&nbsp</td>
            <td class="place" id="1406">&nbsp</td>
            <td class="place" id="1407">&nbsp</td>
            <td class="place" id="1408">&nbsp</td>
            <td class="place" id="1409">&nbsp</td>
            <td class="place" id="1410">&nbsp</td>
            <td class="place" id="1411">&nbsp</td>
            <td class="place" id="1412">&nbsp</td>
            <td class="place" id="1413">&nbsp</td>
            <td class="place" id="1414">&nbsp</td>
            <td class="place" id="1415">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="1501">&nbsp</td>
            <td class="place" id="1502">&nbsp</td>
            <td class="place" id="1503">&nbsp</td>
            <td class="place" id="1504">&nbsp</td>
            <td class="place" id="1505">&nbsp</td>
            <td class="place" id="1506">&nbsp</td>
            <td class="place" id="1507">&nbsp</td>
            <td class="place" id="1508">&nbsp</td>
            <td class="place" id="1509">&nbsp</td>
            <td class="place" id="1510">&nbsp</td>
            <td class="place" id="1511">&nbsp</td>
            <td class="place" id="1512">&nbsp</td>
            <td class="place" id="1513">&nbsp</td>
            <td class="place" id="1514">&nbsp</td>
            <td class="place" id="1515">&nbsp</td>
        </tr>
    </table>

   <!-- 控件模块 -->
   <br>
   <div>
   <input class="set" type="button" value="加入黑棋先手等候列表" onclick="status(0)">
   <input class="set" type="button" value="加入白棋后手等候列表" onclick="status(1)"><br/>
	<input class="start" type="button" value="上移光标" onclick="up()">
   <input class="start" type="button" value="下移光标" onclick="down()">
	<input class="start" type="button" value="左移光标" onclick="left()">
   <input class="start" type="button" value="右移光标" onclick="right()">
	 <input class="start" type="button" value="落子" onclick="sure()"><br/>
   <input class="end" type="button" value="再来一局" onclick="fightagain()">
   <input class="start" type="button" value="投降求和" onclick="iamnoob()">
   </div>
  </div>
</body>
<!-- Body Ends -->
</html