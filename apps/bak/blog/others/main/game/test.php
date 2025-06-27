<head>
<script src="//cdn.bootcdn.net/ajax/libs/eruda/2.3.3/eruda.js"></script>
<script>eruda.init();</script>

<?php
$n=0;
$pos=fopen("position.csv","r+") or exit("获取服务器文件失败!");
$col=fopen("color.csv","r+") or exit("获取服务器文件失败!");
$pos=fgetcsv($pos);
$col=fgetcsv($col);
//echo "$pos[0]"."nihai$col[0]";
//echo "test";
/*while($n < count($pos)){
	echo "#$pos[$n]{background = 'url($col[$n].png)';}<br/>";
	$n++;
}*//*
if($_GET['aaa']){
		$n++;
	}
//echo "$_GET";*/
?>
<script>
	var rpos = 0;//rememberPos
	<?php
		if($_GET["rpos"]){echo "rpos = ".$_GET["rpos"];}
	?>
	alert(rpos);//调试记忆上次位置
	var cursorX = 8;
	var cursorY = 8;
	var ids;		//操作对象坐标
	function checks(){
		if(rpos>0&&rpos<15){
			ids = rpos;
		}else{
		var tx = cursorX;
		var ty = cursorY;
			if(tx<10){
				tx="0"+tx;
			}
			if(ty<10){
				ty="0"+ty;
			}
		ids = 'a' + ty +""+ tx;
		}
		/*document.getElementById("a0808").style.backgroundColor = "rgba(255,255,255,0)";
		document.getElementById(ids).style.backgroundColor = "yellow";
		*/
		//alert("测试："+ids);//调试使用
	}
	function ups(){
		if(cursorY>1){
		checks();
		document.getElementById(ids).style.backgroundColor = "rgba(255,255,255,0)";
		cursorY--;
		checks();
		document.getElementById(ids).style.backgroundColor = "red";
		}
	}
	function downs(){
		if(cursorY<15){
		checks();
		document.getElementById(ids).style.backgroundColor = "rgba(255,255,255,0)";
		cursorY++;
		checks();
		document.getElementById(ids).style.backgroundColor = "red";
		}
	}
	function rights(){
		if(cursorX<15){
		checks();
		document.getElementById(ids).style.backgroundColor = "rgba(255,255,255,0)";
		cursorX++;
		checks();
		document.getElementById(ids).style.backgroundColor = "red";
		}
	}
	function lefts(){
		if(cursorX>1){
		checks();
		document.getElementById(ids).style.backgroundColor = "rgba(255,255,255,0)";
		cursorX--;
		checks();
		document.getElementById(ids).style.backgroundColor = "red";
		}
	}
	function sure(){
		//if(){}是否是你的回合
		document.getElementById(ids).style.backgroundColor = "rgba(255,255,255,0";
		document.getElementById("qizipos").value = ibs;	
		alert("debug：检查隐藏input值"+document.getElementById("qizipos").value);
		document.getElementById("sendqizi").submit();
	}
	
/*
		var temp = ids;
		var idss = //document.getElementById(temp);
		while(true){
		if(idss.style.backgroundColor!="red"){
			//document.getElementById(ids).style.backgroundColor = "red";
		}
		if(idss != //document.getElementById(ids)){
			idss.style.backgroundColor = "none";
			temp = ids;
		}
	}*/
</script>
<form method="get" action="test.php" id="sendqizi">
<input type="hidden" id="qizipos" name="waiter">
<input class="start" type="button" value="落子" onclick="sure()">
<input class="start" type="button" value="上移光标" onclick="ups()">
<input class="start" type="button" value="下移光标" onclick="downs()">
<input class="start" type="button" value="左移光标" onclick="lefts()">
<input class="start" type="button" value="右移光标" onclick="rights()">
<input class="start" type="button" value="check" onclick="checks()">

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
			z-index: -100;
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
	  .place{
		bolder: 1px soild red;
		/*background-color: black;*/
	}
    </style>
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
            <td class="place" id="a0701">&nbsp</td>
            <td class="place" id="a0702">&nbsp</td>
            <td class="place" id="a0703">&nbsp</td>
            <td class="place" id="a0704">&nbsp</td>
            <td class="place" id="a0705">&nbsp</td>
            <td class="place" id="a0706">&nbsp</td>
            <td class="place" id="a0707">&nbsp</td>
            <td class="place" id="a0708">&nbsp</td>
            <td class="place" id="a0709">&nbsp</td>
            <td class="place" id="a0710">&nbsp</td>
            <td class="place" id="a0711">&nbsp</td>
            <td class="place" id="a0712">&nbsp</td>
            <td class="place" id="a0713">&nbsp</td>
            <td class="place" id="a0714">&nbsp</td>
            <td class="place" id="a0715">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a0801">&nbsp</td>
            <td class="place" id="a0802">&nbsp</td>
            <td class="place" id="a0803">&nbsp</td>
            <td class="place" id="a0804">&nbsp</td>
            <td class="place" id="a0805">&nbsp</td>
            <td class="place" id="a0806">&nbsp</td>
            <td class="place" id="a0807">&nbsp</td>
            <td class="place" id="a0808">&nbsp</td>
            <td class="place" id="a0809">&nbsp</td>
            <td class="place" id="a0810">&nbsp</td>
            <td class="place" id="a0811">&nbsp</td>
            <td class="place" id="a0812">&nbsp</td>
            <td class="place" id="z0813">&nbsp</td>
            <td class="place" id="a0814">&nbsp</td>
            <td class="place" id="a0815">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a0901">&nbsp</td>
            <td class="place" id="a0902">&nbsp</td>
            <td class="place" id="a0903">&nbsp</td>
            <td class="place" id="a0904">&nbsp</td>
            <td class="place" id="a0905">&nbsp</td>
            <td class="place" id="a0906">&nbsp</td>
            <td class="place" id="a0907">&nbsp</td>
            <td class="place" id="a0908">&nbsp</td>
            <td class="place" id="a0909">&nbsp</td>
            <td class="place" id="a0910">&nbsp</td>
            <td class="place" id="a0911">&nbsp</td>
            <td class="place" id="a0912">&nbsp</td>
            <td class="place" id="a0913">&nbsp</td>
            <td class="place" id="a0914">&nbsp</td>
            <td class="place" id="a0915">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a1001">&nbsp</td>
            <td class="place" id="a1002">&nbsp</td>
            <td class="place" id="a1003">&nbsp</td>
            <td class="place" id="a1004">&nbsp</td>
            <td class="place" id="a1005">&nbsp</td>
            <td class="place" id="a1006">&nbsp</td>
            <td class="place" id="a1007">&nbsp</td>
            <td class="place" id="a1008">&nbsp</td>
            <td class="place" id="a1009">&nbsp</td>
            <td class="place" id="a1010">&nbsp</td>
            <td class="place" id="a1011">&nbsp</td>
            <td class="place" id="a1012">&nbsp</td>
            <td class="place" id="a1013">&nbsp</td>
            <td class="place" id="a1014">&nbsp</td>
            <td class="place" id="a1015">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a1101">&nbsp</td>
            <td class="place" id="a1102">&nbsp</td>
            <td class="place" id="a1103">&nbsp</td>
            <td class="place" id="a1104">&nbsp</td>
            <td class="place" id="a1105">&nbsp</td>
            <td class="place" id="a1106">&nbsp</td>
            <td class="place" id="a1107">&nbsp</td>
            <td class="place" id="a1108">&nbsp</td>
            <td class="place" id="a1109">&nbsp</td>
            <td class="place" id="a1110">&nbsp</td>
            <td class="place" id="a1111">&nbsp</td>
            <td class="place" id="a1112">&nbsp</td>
            <td class="place" id="a1113">&nbsp</td>
            <td class="place" id="a1114">&nbsp</td>
            <td class="place" id="a1115">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a1201">&nbsp</td>
            <td class="place" id="a1202">&nbsp</td>
            <td class="place" id="a1203">&nbsp</td>
            <td class="place" id="a1204">&nbsp</td>
            <td class="place" id="a1205">&nbsp</td>
            <td class="place" id="a1206">&nbsp</td>
            <td class="place" id="a1207">&nbsp</td>
            <td class="place" id="a1208">&nbsp</td>
            <td class="place" id="a1209">&nbsp</td>
            <td class="place" id="a1210">&nbsp</td>
            <td class="place" id="a1211">&nbsp</td>
            <td class="place" id="a1212">&nbsp</td>
            <td class="place" id="a1213">&nbsp</td>
            <td class="place" id="a1214">&nbsp</td>
            <td class="place" id="a1215">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a1301">&nbsp</td>
            <td class="place" id="a1302">&nbsp</td>
            <td class="place" id="a1303">&nbsp</td>
            <td class="place" id="a1304">&nbsp</td>
            <td class="place" id="a1305">&nbsp</td>
            <td class="place" id="a1306">&nbsp</td>
            <td class="place" id="a1307">&nbsp</td>
            <td class="place" id="a1308">&nbsp</td>
            <td class="place" id="a1309">&nbsp</td>
            <td class="place" id="a1310">&nbsp</td>
            <td class="place" id="a1311">&nbsp</td>
            <td class="place" id="a1312">&nbsp</td>
            <td class="place" id="a1313">&nbsp</td>
            <td class="place" id="a1314">&nbsp</td>
            <td class="place" id="a1315">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a1401">&nbsp</td>
            <td class="place" id="a1402">&nbsp</td>
            <td class="place" id="a1403">&nbsp</td>
            <td class="place" id="a1404">&nbsp</td>
            <td class="place" id="a1405">&nbsp</td>
            <td class="place" id="a1406">&nbsp</td>
            <td class="place" id="a1407">&nbsp</td>
            <td class="place" id="a1408">&nbsp</td>
            <td class="place" id="a1409">&nbsp</td>
            <td class="place" id="a1410">&nbsp</td>
            <td class="place" id="a1411">&nbsp</td>
            <td class="place" id="a1412">&nbsp</td>
            <td class="place" id="a1413">&nbsp</td>
            <td class="place" id="a1414">&nbsp</td>
            <td class="place" id="a1415">&nbsp</td>
        </tr>
        <tr>
            <td class="place" id="a1501">&nbsp</td>
            <td class="place" id="a1502">&nbsp</td>
            <td class="place" id="a1503">&nbsp</td>
            <td class="place" id="a1504">&nbsp</td>
            <td class="place" id="a1505">&nbsp</td>
            <td class="place" id="a1506">&nbsp</td>
            <td class="place" id="a1507">&nbsp</td>
            <td class="place" id="a1508">&nbsp</td>
            <td class="place" id="a1509">&nbsp</td>
            <td class="place" id="a1510">&nbsp</td>
            <td class="place" id="a1511">&nbsp</td>
            <td class="place" id="a1512">&nbsp</td>
            <td class="place" id="a1513">&nbsp</td>
            <td class="place" id="a1514">&nbsp</td>
            <td class="place" id="a1515">&nbsp</td>
        </tr>
    </table>
</body>
<!-- Body Ends -->
</html>