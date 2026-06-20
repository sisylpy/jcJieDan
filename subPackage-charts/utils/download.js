/**
 * 下载管理器
 * Created by 全科 on 2018/1/27.
 */

 import apiUrl from '../../config'

function downloadSaveFile(obj) {
  let success = obj.success;
  let fail = obj.fail;
  let id = "";
  let url = obj.url;
  if (obj.id){
    id = obj.id;
  }else{
    id = url;
  }
  wx.downloadFile({
    url: obj.url,
    success: function (res) {
      wx.saveFile({
        tempFilePath: res.tempFilePath,
        success: function (result) {
          result.id = id;
          if (success) {
            success(result);
          }
        },
        fail: function (e) {
          if (fail) {
            fail(e);
          }
        }
      })
    },
    fail: function (e) {
      if (fail) {
        fail(e);
      }
    }
  })
}

function downloadSaveFiles(obj) {
  var downUrl = apiUrl.apiUrl + "nxdistributeruser/downLoadNumber/"
  
  let url0 = downUrl + 0;
  let url1 = downUrl + 1;
  let url2 = downUrl + 2;
  let url3 = downUrl + 3;
  let url4 = downUrl + 4;
  let url5 = downUrl + 5;
  let url6 = downUrl + 6;
  let url7 = downUrl + 7;
  let url8 = downUrl + 8;
  let url9 = downUrl + 9;
  let url10 = downUrl + "close";
  let url11 = downUrl + "delete";
  let url12 = downUrl + "finish";
  let url13 = downUrl + "dian";
  let url14 = downUrl + "lingdian";
  let url15 = downUrl + "next";
  let url16 = downUrl + "tishi";

  obj.urls = [
    url0, url1, url2, url3, url4, url5, url6, url7, url8, url9, url10,
    url11, url12, url13, url14, url15, url16];
  let success = obj.success;
  let fail = obj.fail;
  var savedFilePaths = [];
  let urlsLength = obj.urls.length;
  for (let i = 0; i < urlsLength; i++) {
    downloadSaveFile({
      url: obj.urls[i],
      success: function (res) {
        var id = res.id.substring(downUrl.length, res.id.length)  
        savedFilePaths.push({ id: id, filePath: res.savedFilePath });
        if (savedFilePaths.length == urlsLength && success) {
          success(savedFilePaths);
        }
      },
      fail: function (e) {
        if (fail) fail(e);
      }
    })
  }
}
module.exports = {
  downloadSaveFiles: downloadSaveFiles
}
