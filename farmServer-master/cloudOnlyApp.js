//###########################################################################################
//#####################################초기화################################################

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cloudOnlyApp = express();
const dbConn = require('./mariadbConn');
const timeGetter = require('./timeConvert');
const portNum = 5000;
const fogAddress = 'http://223.194.33.67:10033';


const interServerSocketIO = require('socket.io-client');
var interServerSocket = interServerSocketIO(fogAddress);

// 기타 전역 변수 모음
var currentUser = 'none';
var userReqTime = 0;
var dataBeanGlobal = 'none';

cloudOnlyApp.use(bodyParser.json());
cloudOnlyApp.use(bodyParser.urlencoded({extended: true}));
cloudOnlyApp.use(express.static('viewsForCloud/cssAndpics'));
cloudOnlyApp.use('/socket.io', express.static('node_modules/socket.io'));

//UI용 소켓 만들기
var http = require('http').Server(cloudOnlyApp);
var io = require('socket.io')(http);
var socketGlobal = 'none';

//###########################################################################################
//###################################서버 간 소켓 통신#######################################

interServerSocket.on('house1Msg', function(databean){
    var fogDepTime = timeGetter.convertToMilli(databean.house[0].fogDepTime);
    var imsiData = {msgID: databean.house[0].msgID, fogDepTime: fogDepTime};
    interServerSocket.emit('house1SyncReqFromCloud', imsiData);
    console.log('house1Msg received. msgID: '+databean.house[0].msgID);
});

interServerSocket.on('house1SyncResFromFog', function(databean){
    console.log('house1SyncResFromFog has arrived. ');
    if(socketGlobal!='none'){
        dataBeanGlobal = databean;
        databean.house[0].cloudDepTime = timeGetter.now();
        socketGlobal.emit('house1MsgToUser',databean);
    }else if(socketGlobal=='none'){
        console.log('house1SyncResFromFog::socketGlobal not connected. ');
    }
    var msgID = timeGetter.msgIDToMilli(databean.house[0].msgID);
    var msgIDLast, saveParam;
    // 일단 모든 데이터는 house1CloudOnly에 저장. (촘촘히 저장)
    dbConn.insertDataCloudOnly(databean, 'house1').catch((err)=>{console.log(err);});
    // 과거 데이터에 house1 테이블에 저장. 
    dbConn.getTheLastRow('house1').catch(
        (err)=>{console.log(err);}
    ).then(
        (result)=>{
            msgIDLast = timeGetter.msgIDToMilli(result[0].msgID);
            saveParam = msgID - msgIDLast;
            if(saveParam>=60000){
                dbConn.insertDataToCloud(databean, 'house1');
            }
        }
    );
});

interServerSocket.on('house2Msg', function(databean){
    var fogDepTime = timeGetter.convertToMilli(databean.house[1].fogDepTime);
    var imsiData = {msgID: databean.house[1].msgID, fogDepTime: fogDepTime};
    interServerSocket.emit('house2SyncReqFromCloud', imsiData);
    console.log('house2Msg received. msgID: '+databean.house[1].msgID);
});

interServerSocket.on('house2SyncResFromFog', function(databean){
    console.log('house2SyncResFromFog has arrived. ');
    if(socketGlobal!='none'){
        dataBeanGlobal = databean;
        databean.house[0].cloudDepTime = timeGetter.now();
        socketGlobal.emit('house2MsgToUser',databean);
    }else if(socketGlobal=='none'){
        console.log('house2SyncResFromFog::socketGlobal not connected. ');
    }
    var msgID = timeGetter.msgIDToMilli(databean.house[1].msgID);
    var msgIDLast, saveParam;
    // 일단 모든 데이터는 house1CloudOnly에 저장. (촘촘히 저장)
    dbConn.insertDataCloudOnly(databean, 'house2').catch((err)=>{console.log(err);});
    // 과거 데이터에 house1 테이블에 저장. 
    dbConn.getTheLastRow('house2').catch(
        (err)=>{console.log(err);}
    ).then(
        (result)=>{
            msgIDLast = timeGetter.msgIDToMilli(result[0].msgID);
            saveParam = msgID - msgIDLast;
            if(saveParam>=60000){
                dbConn.insertDataToCloud(databean, 'house2');
            }
        }
    );
});

//###########################################################################################
//#################################http GET, POST 통신#######################################
cloudOnlyApp.get('/', function(req, res){
    console.log('This is the home address.');
    console.log('Redirecting to the login page.');
    res.redirect('/login.do');
});

cloudOnlyApp.get('/login.do', function(req, res){
    console.log('Entered login page.');
    res.sendFile(path.join(__dirname, 'viewsForCloud', 'index.html'));
});

cloudOnlyApp.post('/loginClick.do', function(req, res){
    console.log('Log-in button was clicked.');
    var id = req.body.logID;
    var pw = req.body.password;
    var userLoginClickTime = req.body.userLoginClickTime;
    console.log(req.body);

    dbConn.loginQuery(id, pw).then(function(resultValue){
        if(resultValue == 'No id' || resultValue == 'Wrong password'){
            console.log('아이디/비밀번호가 일치하지 않습니다.');
            res.sendFile(path.join(__dirname, 'viewsForCloud', 'index.html'));
        }else{
            console.log(resultValue.id+'님 환영합니다. ');
            res.redirect('/realdata.do?user='+resultValue.id+'&userLoginClickTime='+userLoginClickTime);
        }
    });
});

cloudOnlyApp.get('/realdata.do', function(req, res){
    currentUser = req.query.user;
    if(req.query.userLoginClickTime != null){
        userReqTime = req.query.userLoginClickTime;    
    }else if(req.query.userLoginClickTime == null){
        userReqTime = 'none';
    }
    res.sendFile(path.join(__dirname,'viewsForCloud','realtimepage.html'));
});

cloudOnlyApp.get('/pastdatapage.do', function(req, res){
    console.log('cloudApp.get: pastdatapage.do received.');
    currentUser = req.query.user;
    console.log('pastdatapage.do: currentUser: '+currentUser);
    res.sendFile(path.join(__dirname, 'viewsForCloud', 'pastdatapage.html'));
});

cloudOnlyApp.get('/controlpage.do', function(req, res){
    console.log('/controlpage.do: '+req.query.user);
    currentUser = req.query.user;
    res.sendFile(path.join(__dirname,'viewsForCloud','controlpage.html'));
});

cloudOnlyApp.post('/setData.do', function(req, res){
    console.log('setData.do. requested.');
    res.redirect(fogAddress+'/realdata.do');
});

//http 리스너
http.listen(portNum, function(){
    console.log('Listening on port: '+portNum);
});

//###########################################################################################
//################################User와 소켓통신##########################################
io.on('connection', function(socket){
    console.log('Socket connected with user.');
    socketGlobal = socket;
    socket.on('disconnect', function(){
        console.log('User '+currentUser+' disconnected.');
    });
    socket.on('userWho', function(){
        socket.emit('currentUserIs', currentUser);
    });
    socket.on('house1GraphDataReq', function(){
        dbConn.getGraphDatasetCloudOnly('house1').catch(
            (err)=>{console.log(err);}
        ).then(
            (result)=>{
                socket.emit('house1GraphDataRes', {result, currentUser, userReqTime});
            }
        );
    });

    socket.on('house2GraphDataReq', function(){
        dbConn.getGraphDatasetCloudOnly('house2').catch(
            (err)=>{console.log(err);}
        ).then(
            (result)=>{
                socket.emit('house2GraphDataRes', {result, currentUser});
            }
        );
    });

    socket.on('realPageUserReq', function(realPageUserReqTime){
        socket.emit('realPageUserRes', realPageUserReqTime);
    });

    socket.on('pastGraphDataReq', function(houseName){
        dbConn.getGraphDataset(houseName)
        .catch((err)=>{console.log(err);})
        .then((result)=>{
            socket.emit('pastGraphDataRes', {result, houseName});
        });
    });
    socket.on('last5DataReq', function(houseName){
        dbConn.getLast5Data(houseName)
        .catch((err)=>{console.log(err);})
        .then((result)=>{
            socket.emit('last5DataRes', {result, houseName});
        });
    });
    socket.on('pastPageUserReq', function(pastPageUserReqTime){
        socket.emit('pastPageUserRes', pastPageUserReqTime);
    });
    socket.on('userArrTimeHouse1', function(msgid){
        if(msgid == dataBeanGlobal.house[0].msgID){
            var userToCloudArrTimeMilli = timeGetter.nowMilli();
            var cloudDepTimeMilli = timeGetter.convertToMilli(dataBeanGlobal.house[0].cloudDepTime);
            var rtt = userToCloudArrTimeMilli - cloudDepTimeMilli;
            var oneWayDelay = Math.round(rtt / 2.0);
            var estimatedUserArrTime = cloudDepTimeMilli + oneWayDelay;
            dataBeanGlobal.house[0].userArrTime = timeGetter.millToTime(estimatedUserArrTime);
            dbConn.insertUserArrTimeCloudOnly(msgid, dataBeanGlobal.house[0].userArrTime).catch((err)=>{console.log(err);})
        }else if(msgid != dataBeanGlobal.house[0].msgID){
            console.log('userArrTimeHouse1:: msgid does not match dataBeanGlobal msgID');
        }
    });
    socket.on('userArrTimeHouse2', function(msgid){
        if(msgid == dataBeanGlobal.house[1].msgID){
            var userToCloudArrTimeMilli = timeGetter.nowMilli();
            var cloudDepTimeMilli = timeGetter.convertToMilli(dataBeanGlobal.house[1].cloudDepTime);
            var rtt = userToCloudArrTimeMilli - cloudDepTimeMilli;
            var oneWayDelay = Math.round(rtt / 2.0);
            var estimatedUserArrTime = cloudDepTimeMilli + oneWayDelay;
            dataBeanGlobal.house[1].userArrTime = timeGetter.millToTime(estimatedUserArrTime);
            dbConn.insertUserArrTimeCloudOnly(msgid, dataBeanGlobal.house[1].userArrTime).catch((err)=>{console.log(err);})
        }else if(msgid != dataBeanGlobal.house[1].msgID){
            console.log('userArrTimeHouse2:: msgid does not match dataBeanGlobal msgID');
        }
    });
});