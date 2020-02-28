var express         = require('express');
var path            = require('path');
var bodyParser      = require('body-parser');
var app             = express();
var dbConn          = require('./mariadbConn');
var timeConv        = require('./timeConvert');

//전역 변수로 데이터빈 객체 사용
var dataBean        = require('./dataBean');
const io            = require('socket.io');
const socketServer  = io.listen(3000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('views/cssAndpics'));

app.get('/', function(req,res){
    console.log("Get request arrived. index.html is sent.");
    res.sendFile(path.join(__dirname,'views','indexOld.html'));
});

//프런트에서 getData.do 요청이 오면, 응답으로 데이터빈을 보냄. 
app.post('/getData.do', function(req,res){
    console.log('getData.do request received.');
    if(req.body.userData.userData1.fanMode == 1){
        dataBean.house[0].fanMode   = req.body.userData.userData1.fanMode;
        dataBean.house[0].fan1      = req.body.userData.userData1.fan1;
        dataBean.house[0].fan2      = req.body.userData.userData1.fan2;
        dataBean.house[0].fan3      = req.body.userData.userData1.fan3;
    }

    if(req.body.userData.userData2.fanMode == 1){
        dataBean.house[1].fanMode   = req.body.userData.userData2.fanMode;
        dataBean.house[1].fan1      = req.body.userData.userData2.fan1;
        dataBean.house[1].fan2      = req.body.userData.userData2.fan2;
        dataBean.house[1].fan3      = req.body.userData.userData2.fan3;
    }

    if(req.body.userData.userData1.waterMode == 1){
        dataBean.house[0].waterMode = req.body.userData.userData1.waterMode;
        dataBean.house[0].water     = req.body.userData.userData1.water;
    }
    if(req.body.userData.userData2.waterMode == 1){
        dataBean.house[1].waterMode = req.body.userData.userData2.waterMode;
        dataBean.house[1].water     = req.body.userData.userData2.water;
    }
    res.send(dataBean);
});

//프런트에서 사용자가 설정값을 입력하면, 그것에 대한 응답. 
app.post('/setData.do', function(req,res){
    console.log('setData.do request received.');
    dataBean.house[0].tarTemp   = req.body.house1TarTemp;
    dataBean.house[0].tempBand  = req.body.house1TempBand;
    dataBean.house[1].tarTemp   = req.body.house2TarTemp;
    dataBean.house[1].tempBand  = req.body.house2TempBand;
    res.sendFile(path.join(__dirname,'views','indexOld.html'));
});

//웹 서버 리스너
app.listen(5000, function(){
    console.log('listening on 5000');
});

//농장 서버와 소켓통신 리스너
socketServer.on("connection", function(socket){
    console.log('user connected');

    // //농장 서버에다가 매 20초마다 'giveMeData'요청을 보낸다. 
    // setInterval(()=>{
    //     socket.emit('giveMeData');
    // }, 10000);

    //농장 서버에서 giveMeData 요청에 대한 응답으로 농장 센서 데이터값을 보내온다. 
    socket.on('house',(house)=>{
        // 메세지 받은 시각을 데이터빈에 기록
        var arrTime = timeConv.getCurrentTime();
        console.log('House data received. current time: '+ new Date());
        // 데이터빈에 저장한다. 
        for(i=0;i<2;i++){
            //메세지 시각 기록
            dataBean.house[i].arrTime = arrTime;
            for(j=0;j<2;j++){
                dataBean.house[i].msgTime[j] = house[i].sigTime[j];
            }
            
            //온도, 습도, 메세지 시간 데이터빈에 저장
            for(j=0;j<6;j++){
                dataBean.house[i].temp[j] = house[i].temperature[j];
                dataBean.house[i].humid[j] = house[i].humidity[j];
                dataBean.house[i].avgTemp += house[i].temperature[j];
                dataBean.house[i].avgHumid += house[i].humidity[j];
            }
            dataBean.house[i].avgTemp = Math.round(dataBean.house[i].avgTemp / 6);
            dataBean.house[i].avgHumid = Math.round(dataBean.house[i].avgHumid / 6);
    
            //환기량 계산 후 팬 가동
            dataBean.house[i].ventilPer = Math.round(((dataBean.house[i].avgTemp - dataBean.house[i].tarTemp)/dataBean.house[i].tempBand)*100);
            if(dataBean.house[i].fanMode == 0){
                if(dataBean.house[i].ventilPer < 33){
                    dataBean.house[i].fan[0] = 1;
                    dataBean.house[i].fan[1] = 0;
                    dataBean.house[i].fan[2] = 0;
                }else if(dataBean.house[i].ventilPer >= 33 && dataBean.house[i].ventilPer < 66){
                    dataBean.house[i].fan[0] = 1;
                    dataBean.house[i].fan[1] = 1;
                    dataBean.house[i].fan[2] = 0;
                }else if(dataBean.house[i].ventilPer >= 66){
                    dataBean.house[i].fan[0] = 1;
                    dataBean.house[i].fan[1] = 1;
                    dataBean.house[i].fan[2] = 1;
                }
            }
            //고온 알람
            if(dataBean.house[i].ventilPer > 120){
                dataBean.house[i].alarm = 1;
            }
            //습도에 따른 가습기 제어
            if(dataBean.house[i].waterMode == 0){
                if(dataBean.house[i].avgHumid < 55){
                    dataBean.house[i].water = 1;
                }else if(dataBean.house[i].avgHumid >= 70){
                    dataBean.house[i].water = 0;
                }
            }
        }
        dbConn.insertData(dataBean).catch(
            (err)=>{
                console.log(err);
            }
        );
        console.log('controlData will be sent to the gateWay.');
        console.log(dataBean.house[0].temp1);
        socket.emit('controlData', dataBean);
    }); 
});

//매 1분마다 DB에 데이터빈 값을 저장한다. 
// setInterval(()=>{
//     dbConn.insertData(dataBean).catch(
//         (err) =>{
//             console.log(err);
//         }
//     );
    // dbConn.selectData('house1').catch(
    //     (err) => {
    //         console.log(err);
    //     }
    // ).then((result)=>{
    //     dataBean.house[0].
        
    //     console.log(result[0].temp1);
    // });
// },5000);