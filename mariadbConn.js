const mariadb = require('mariadb');
const timeConv = require('./timeConvert');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'admin',
    password: '1234',
    connectionLimit: 5
});

async function insertData(dataBean){
    let conn;
    try{
        conn = await pool.getConnection();
        conn.query('USE farmData');
        var sql1 = 'INSERT INTO House1(msgTimeTemp, msgTimeHumid, arrTime, tarTemp, '+
        'tempBand, ventilPer, temp1, temp2, temp3, temp4, temp5, temp6, avgTemp, '+
        'humid1, humid2, humid3, humid4, humid5, humid6, avgHumid, fanMode, '+
        'fan1, fan2, fan3, waterMode, water, alarm) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var sql2 = 'INSERT INTO House2(msgTimeTemp, msgTimeHumid, arrTime, tarTemp, '+
        'tempBand, ventilPer, temp1, temp2, temp3, temp4, temp5, temp6, avgTemp, '+
        'humid1, humid2, humid3, humid4, humid5, humid6, avgHumid, fanMode, '+
        'fan1, fan2, fan3, waterMode, water, alarm) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var sql = [sql1, sql2];
        for(i=0;i<2;i++){
            var msgTimeTemp = timeConv.convertToTime(dataBean.house[i].msgTimeTemp);
            var msgTimeHumid = timeConv.convertToTime(dataBean.house[i].msgTimeHumid);
            conn.query(sql[i],[
                msgTimeTemp, msgTimeHumid, 
                dataBean.house[i].arrTime, dataBean.house[i].tarTemp, 
                dataBean.house[i].tempBand, dataBean.house[i].ventilPer, 
                dataBean.house[i].temp[0], dataBean.house[i].temp[1], 
                dataBean.house[i].temp[2], dataBean.house[i].temp[3], 
                dataBean.house[i].temp[4], dataBean.house[i].temp[5], dataBean.house[i].avgTemp,
                dataBean.house[i].humid[0], dataBean.house[i].humid[1], 
                dataBean.house[i].humid[2], dataBean.house[i].humid[3], 
                dataBean.house[i].humid[4], dataBean.house[i].humid[5], dataBean.house[i].avgHumid, 
                dataBean.house[i].fanMode, dataBean.house[i].fan[0], 
                dataBean.house[i].fan[1], dataBean.house[i].fan[2],
                dataBean.house[i].waterMode, dataBean.house[i].water, dataBean.house[i].alarm
            ]);
        }
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
    }
}

async function loginQuery(id, pw){
    let conn, result, resultValue;
    var sql = 'SELECT id, password FROM identification WHERE id = ?';
    try{
        conn = await pool.getConnection();
        await conn.query('Use farmData');
        result = await conn.query(sql, id);
    }catch(err){
        console.log(err)
    }finally{
        if(conn) conn.end();
        if(result[0] == null){ //해당 일치 아이디가 없을 경우
            resultValue = 'No id';
        }else if(result[0].password != pw){ //아이디는 일치, 비밀번호 불일치
            resultValue = 'Wrong password';
        }else if(result[0].password == pw){ //아이디, 비밀번호 모두 일치
            resultValue = {id: result[0].id, pw: result[0].password};
        }else{
            resultValue = 'Error. etc.';
        }
        return resultValue;
    }
}


async function selectData(house){
    let conn, result;
    var sql = 'SELECT * FROM '+house+' ORDER BY num DESC LIMIT 1';
    try{
        conn = await pool.getConnection();
        await conn.query('USE farmData');
        result = await conn.query(sql);
        // return result;
        // console.log(result[0].temp1);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
        // console.log('connection ended.');
        // console.log(result[0].temp1);
        return result;
    }
    // console.log(result[0].temp1);
}

async function getTheLastRow(house){
    let conn, result;
    var sql = 'SELECT msgID from '+house+' ORDER BY num DESC LIMIT 1';
    try{
        conn = await pool.getConnection();
        await conn.query('USE farmData');
        result = await conn.query(sql);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
        // console.log('mariadbConn.js: getTheLastRow: msgID: '+result[0].msgID);
        return result;
    }
}

async function insertDataToCloud(dataBean, house){
    let conn;
    var houseNum = house.substr(5,1) - 1;
    var sql = 'INSERT INTO '+house+'(msgID, edgeDepTime, '+
        'fogArrTime, fogDepTime, cloudArrTime, avgTemp, avgHumid) '+
        'VALUES(?,?,?,?,?,?,?)';
    try{
        conn = await pool.getConnection();
        conn.query('USE farmData');
        conn.query(sql, [
            dataBean.house[houseNum].msgID,         dataBean.house[houseNum].edgeDepTime,
            dataBean.house[houseNum].fogArrTime,    dataBean.house[houseNum].fogDepTime,
            dataBean.house[houseNum].cloudArrTime,  dataBean.house[houseNum].avgTemp,
            dataBean.house[houseNum].avgHumid
        ]);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
    }
}

async function insertData(dataBean){
    let conn;
    try{
        conn = await pool.getConnection();
        conn.query('USE farmData');
        var sql1 = 'INSERT INTO House1(msgTimeTemp, msgTimeHumid, arrTime, tarTemp, '+
        'tempBand, ventilPer, temp1, temp2, temp3, temp4, temp5, temp6, avgTemp, '+
        'humid1, humid2, humid3, humid4, humid5, humid6, avgHumid, fanMode, '+
        'fan1, fan2, fan3, waterMode, water, alarm) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var sql2 = 'INSERT INTO House2(msgTimeTemp, msgTimeHumid, arrTime, tarTemp, '+
        'tempBand, ventilPer, temp1, temp2, temp3, temp4, temp5, temp6, avgTemp, '+
        'humid1, humid2, humid3, humid4, humid5, humid6, avgHumid, fanMode, '+
        'fan1, fan2, fan3, waterMode, water, alarm) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var sql = [sql1, sql2];
        for(i=0;i<2;i++){
            var msgTimeTemp = timeConv.convertToTime(dataBean.house[i].msgTimeTemp);
            var msgTimeHumid = timeConv.convertToTime(dataBean.house[i].msgTimeHumid);
            conn.query(sql[i],[
                msgTimeTemp, msgTimeHumid, 
                dataBean.house[i].arrTime, dataBean.house[i].tarTemp, 
                dataBean.house[i].tempBand, dataBean.house[i].ventilPer, 
                dataBean.house[i].temp[0], dataBean.house[i].temp[1], 
                dataBean.house[i].temp[2], dataBean.house[i].temp[3], 
                dataBean.house[i].temp[4], dataBean.house[i].temp[5], dataBean.house[i].avgTemp,
                dataBean.house[i].humid[0], dataBean.house[i].humid[1], 
                dataBean.house[i].humid[2], dataBean.house[i].humid[3], 
                dataBean.house[i].humid[4], dataBean.house[i].humid[5], dataBean.house[i].avgHumid, 
                dataBean.house[i].fanMode, dataBean.house[i].fan[0], 
                dataBean.house[i].fan[1], dataBean.house[i].fan[2],
                dataBean.house[i].waterMode, dataBean.house[i].water, dataBean.house[i].alarm
            ]);
        }
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
    }
}

async function insertUserArrTimeCloudOnly(msgid, userarrtime){
    var houseName = 'house' + msgid[1]+'CloudOnly';
    console.log('mariadbConn.js: houseName: '+houseName);
    var msgID = msgid;
    var userArrTime = userarrtime;
    let conn;
    try{
        conn = await pool.getConnection();
        conn.query('Use farmData');
        var sql = 'UPDATE '+houseName+' SET userArrTime = ? WHERE msgID = ?';
        conn.query(sql, [userArrTime, msgID]);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
    }
}

async function getGraphDataset(house){    
    let conn, result;
    var sql = 'SELECT * FROM '+house+' ORDER BY num DESC LIMIT 100';
    try{
        conn = await pool.getConnection();
        await conn.query('Use farmData');
        result = await conn.query(sql);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
        return result; 
    }
}

//Cloud 시스템 용
async function getGraphDatasetCloudOnly(house){    
    var houseName = house + 'CloudOnly';
    let conn, result;
    var sql = 'SELECT * FROM '+houseName+' ORDER BY num DESC LIMIT 100';
    try{
        conn = await pool.getConnection();
        await conn.query('Use farmData');
        result = await conn.query(sql);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
        return result; 
    }
}

async function getLast5Data(house){
    let conn, result;
    var sql = 'SELECT msgID, avgTemp, avgHumid FROM '+house+' ORDER BY num DESC LIMIT 5';
    try{
        conn = await pool.getConnection();
        await conn.query('Use farmData');
        result = await conn.query(sql);
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
        return result;
    }
}

async function insertDataCloudOnly(dataBean, houseName){
    var houseNum = houseName[5]*1 -1;
    let conn;
    var sql1 = 'INSERT INTO house1CloudOnly(msgID, edgeDepTime, fogArrTime, fogDepTime, '+
        'cloudArrTime, tarTemp, tempBand, ventilPer, temp1, temp2, temp3, '+
        'temp4, temp5, temp6, humid1, humid2, humid3, humid4, humid5, humid6, '+
        'fanMode, fan1, fan2, fan3, waterMode, water, alarm) '+
        'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var sql2 = 'INSERT INTO house2CloudOnly(msgID, edgeDepTime, fogArrTime, fogDepTime, '+
        'cloudArrTime, tarTemp, tempBand, ventilPer, temp1, temp2, temp3, '+
        'temp4, temp5, temp6, humid1, humid2, humid3, humid4, humid5, humid6, '+
        'fanMode, fan1, fan2, fan3, waterMode, water, alarm) '+
        'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';    
    var sql = [sql1, sql2];
    try{
        conn = await pool.getConnection();
        conn.query('Use farmData');
        conn.query(sql[houseNum],
            [
                dataBean.house[houseNum].msgID,        dataBean.house[houseNum].edgeDepTime, 
                dataBean.house[houseNum].fogArrTime,   dataBean.house[houseNum].fogDepTime,
                dataBean.house[houseNum].cloudArrTime,  dataBean.house[houseNum].tarTemp,
                dataBean.house[houseNum].tempBand,     dataBean.house[houseNum].ventilPer,
                dataBean.house[houseNum].temp[0],      dataBean.house[houseNum].temp[1],
                dataBean.house[houseNum].temp[2],      dataBean.house[houseNum].temp[3],
                dataBean.house[houseNum].temp[4],      dataBean.house[houseNum].temp[5],
                dataBean.house[houseNum].humid[0],     dataBean.house[houseNum].humid[1],
                dataBean.house[houseNum].humid[2],     dataBean.house[houseNum].humid[3],
                dataBean.house[houseNum].humid[4],     dataBean.house[houseNum].humid[5],
                dataBean.house[houseNum].fanMode,      dataBean.house[houseNum].fan[0],
                dataBean.house[houseNum].fan[1],       dataBean.house[houseNum].fan[2],
                dataBean.house[houseNum].waterMode,    dataBean.house[houseNum].water,
                dataBean.house[houseNum].alarm
            ]
        );
    }catch(err){
        console.log(err);
    }finally{
        if(conn) conn.end();
    }
}



module.exports = {
    insertData: insertData,
    selectData: selectData,
    loginQuery: loginQuery,
    getTheLastRow: getTheLastRow,
    insertDataToCloud: insertDataToCloud,
    getGraphDataset:getGraphDataset,
    getLast5Data:getLast5Data,
    insertDataCloudOnly:insertDataCloudOnly,
    getGraphDatasetCloudOnly:getGraphDatasetCloudOnly,
    insertUserArrTimeCloudOnly:insertUserArrTimeCloudOnly
};