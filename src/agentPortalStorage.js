// Small preferences/session hints stay in localStorage; larger portal data uses IndexedDB.
// Cached insurance/client data is scoped to the current session and expires after seven days.
// Cache is only a rendering aid: all mutations and financial decisions must be confirmed by the backend.
const DB_NAME='tc-agent-portal-cache';
const DB_VERSION=1;
const STORE_NAME='entries';

function openDb(){
  if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB is unavailable'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'key'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open portal cache'));
    request.onblocked=()=>reject(new Error('Portal cache upgrade is blocked'));
  });
}
function withStore(mode,operation){
  return openDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,mode);
    const store=tx.objectStore(STORE_NAME);
    let result;
    try{result=operation(store)}catch(error){db.close();reject(error);return}
    tx.oncomplete=()=>{db.close();resolve(result?.result)};
    tx.onerror=()=>{db.close();reject(tx.error||new Error('Portal cache transaction failed'))};
    tx.onabort=()=>{db.close();reject(tx.error||new Error('Portal cache transaction aborted'))};
  }));
}
export const portalCache={
  get(key){
    return withStore('readonly',store=>store.get(key));
  },
  set(key,value){
    return withStore('readwrite',store=>store.put({key,...value}));
  },
  async clearScope(scope){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');
      const store=tx.objectStore(STORE_NAME);
      const request=store.openCursor();
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor)return;
        if(String(cursor.key).startsWith(scope+':'))cursor.delete();
        cursor.continue();
      };
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>{db.close();reject(tx.error||new Error('Could not clear portal cache'))};
      tx.onabort=()=>{db.close();reject(tx.error||new Error('Portal cache clear aborted'))};
    });
  }
};
