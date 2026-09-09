/**
 * TEMPORARY TEST ONLY.
 * Run testPaytmManualLinks_() from the Apps Script editor.
 * This checks whether Apps Script can fetch the manually-created
 * Paytm for Business customer pages and distinguish paid/unpaid HTML.
 * Delete this file after the test is completed.
 */
function testPaytmManualLinks_(){
  var links=[
    {
      name:'PAID SAMPLE',
      url:'https://paytm.business/link/onlinePayment?linkName=THANGAMANI&linkId=LL_946287412&om='
    },
    {
      name:'UNPAID SAMPLE',
      url:'https://paytm.business/link/onlinePayment?linkName=THANGAMANI&linkId=LL_946288474&om='
    }
  ];

  var results=[];
  links.forEach(function(item){
    try{
      var response=UrlFetchApp.fetch(item.url,{
        method:'get',
        followRedirects:true,
        muteHttpExceptions:true,
        headers:{
          'User-Agent':'Mozilla/5.0 (compatible; TrustedCircle-Paytm-Link-Test/1.0)'
        }
      });
      var code=response.getResponseCode();
      var html=String(response.getContentText()||'');
      var lower=html.toLowerCase();
      var status='UNKNOWN';
      if(lower.indexOf('the link is already paid')>=0 || lower.indexOf('>link paid<')>=0){
        status='PAID';
      }else if(lower.indexOf('select an option to pay')>=0 || lower.indexOf('has requested payment of')>=0){
        status='UNPAID';
      }
      var amountMatch=html.match(/has requested payment of[^₹0-9]*₹\s*([0-9]+(?:\.[0-9]+)?)/i);
      var orderMatch=html.match(/"orderId":"([^"]+)"/i);
      results.push({
        name:item.name,
        httpStatus:code,
        detectedStatus:status,
        amount:amountMatch?Number(amountMatch[1]):null,
        paytmOrderId:orderMatch?orderMatch[1]:'',
        htmlLength:html.length,
        hasPaytmPage:lower.indexOf('paytm')>=0,
        error:''
      });
      console.log(item.name+' => HTTP '+code+' | '+status+' | amount='+(amountMatch?amountMatch[1]:'')+' | orderId='+(orderMatch?orderMatch[1]:''));
    }catch(err){
      results.push({
        name:item.name,
        httpStatus:null,
        detectedStatus:'FETCH_ERROR',
        amount:null,
        paytmOrderId:'',
        htmlLength:0,
        hasPaytmPage:false,
        error:String(err&&err.message||err)
      });
      console.error(item.name+' => FETCH_ERROR: '+String(err&&err.message||err));
    }
  });

  console.log(JSON.stringify(results,null,2));
  return results;
}
