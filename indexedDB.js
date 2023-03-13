export default class IndexedDB {
  dataBase = null; // 数据库
  dataBaseName = null; // 数据库名
  dataSheetName = null; // 数据表名
  keyName = '' // 主键
  indexArr = [] // 索引
  version = null
  constructor({
    baseName,
    sheetName,
    keyName,
    indexArr,
    version
  }) {
    // baseName: 数据库名称
    // sheetName：数据表名称
    // keyName:主键
    // indexArr: Array<name, unique> 索引<索引名, 索引是否重复(为true则表示同一个项的值不能重复)>
    this.dataBaseName = baseName
    this.dataSheetName = sheetName
    this.keyName = keyName
    this.indexArr = indexArr
    this.version = version
    
    // this.handleSheet()
  }
  // 适用于同一个页面操作多个表格
  open(version) {
    const request = window.indexedDB.open(this.dataBaseName, version)
    return new Promise((resolve, reject) => {
      request.onerror = (event) => {
        console.error('dataBase打开报错', event.target.error)
        reject(event.target.error)
      }
      request.onsuccess = (event) => {
        this.dataBase = event.target.result
        this.version = event.target.result.version
        console.info('dataBase打开成功')
        resolve()
      }
    })
  }
  // 适用于初始化同一个数据库第二个表格
  isReady() {
    // 打开数据库
    const request = window.indexedDB.open(this.dataBaseName, this.version)
    return new Promise((resolve, reject) => {
      request.onerror = (event) => {
        console.error('dataBase打开报错', event.target.error)
        reject(event.target.error)
      }
      request.onsuccess = (event) => {
        this.dataBase = event.target.result
        this.version = event.target.result.version
        console.info('dataBase打开成功', event.target.result)
        resolve()
      }
      // 新建数据表
      request.onupgradeneeded = (event) => {
        this.dataBase = event.target.result
        let objectStore = null
        if (!this.dataBase.objectStoreNames.contains(this.dataSheetName)) { // 不存在该数据表
          console.info('dataBase建表')
          objectStore = this.dataBase.createObjectStore(this.dataSheetName, {
            keyPath: this.keyName
          })
          // 新建索引
          this.indexArr.forEach(item => {
            objectStore.createIndex(item.name, item.name, {
              unique: item.unique || false
            })
          })
        }
      }
    })
    
  }
  // 写数据操作
  write(obj) {
    // put()有则更新，无则新增
    const request = this.dataBase.transaction(this.dataSheetName, 'readwrite')
      .objectStore(this.dataSheetName)
      .put(obj)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.info('write data success')
        resolve(this)
      }
      request.onerror = (e) => {
        console.error('write data fail')
        reject(e.target.error)
      }
    })
  }
  // 新增数据
  add(obj) {
    return new Promise((resolve, reject) => {
      if (this.dataBase.objectStoreNames.contains(this.dataSheetName)) { // 确定有表
        this.write(obj).then(() => {
          resolve()
        }).catch(err => {
          console.error(err);
          reject(err)
        })
      } else { // 如果表未成功建立
        // 第一步断开库连接
        this.dataBase.close()
        // 新增版本(必须新增版本,否则不会执行onupgradeneeded, 而表操作必须在onupgradeneeded回调中执行)
        this.version++;
        // 第二步// 重新建表
        this.isReady().then(() => {
          // 重新写入数据
          this.write(obj).then(() => {
            resolve()
          })
        }).catch(err => {
          console.error(err);
          reject(err)
        })
      }
    })
    
  }
  // 更新数据
  update(obj) {
    // 没有该索引就新增,有就更新
    return new Promise((resolve, reject) => {
      this.add(obj).then(() => {
        resolve()
      }).catch((e) => {
        reject(e)
      })
    })
    
  }
  // 读取数据
  read(key) {
    // throw new Error('xxxxxxxxx')
    return new Promise((resolve, reject) => {
      // throw new Error('1111111')
      if(!this.dataBase.objectStoreNames.contains(this.dataSheetName)) {
        return
      }
      const objectStore = this.dataBase.transaction([this.dataSheetName]).objectStore(this.dataSheetName)
      const request = objectStore.get(key)
      request.onerror = (e) => {
        console.error('read dataBase fail')
        reject(e.target.error)
      }
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result)
        } else {
          console.info('not find any data')
          resolve(null)
        }
      }
    })
  }
  // 删除数据
  remove(key) {
    // 不管有没有这个索引,都是删除成功的回调
    if(!this.dataBase.objectStoreNames.contains(this.dataSheetName)) {
      return
    }
    const request = this.dataBase.transaction([this.dataSheetName], 'readwrite')
      .objectStore(this.dataSheetName)
      .delete(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        console.info('dataBase数据删除成功', e)
        resolve()
      }
      request.onerror = (e) => {
        console.error('dataBase数据删除事务失败')
        reject(e.target.error)
      }
    })
  }
  // 删除数据库
  deleDataBase(dataBaseName) {
    const DBDeleteRequest = window.indexedDB.deleteDatabase(dataBaseName);
    this.dataBase.close();
    return new Promise((resolve, reject) => {
      DBDeleteRequest.onerror = (event) => {
        console.error("Error deleting database.");
        reject(event.target.error)
      };
      DBDeleteRequest.onsuccess = (event) => {
        console.log("Database deleted successfully", event);
        console.log(event.result); // should be undefined
        resolve(event.result)
      };
    })
  }


  // 删除表
  deleSheet(version) {
    const request = window.indexedDB.open(this.dataBaseName, version);
    console.log(version, '删除表')

    return new Promise((resolve, reject) => {
      request.onerror = (event) => {
        // Handle errors.
        console.error(event.target.error)
        reject(event.target.error)
      };
      request.onsuccess = (event) => {
        this.dataBase.close();
        console.log('delet success')
      }
      request.onupgradeneeded = (event) => {
        this.dataBase = event.target.result;
        this.version = this.dataBase.version;
        this.dataBase.deleteObjectStore(this.dataSheetName);
        // this.dataBase.close(); 
        //删除之后不需要再关闭,否则会报错 DOMException: The connection was closed
        console.log(event.target, 'delete success')
        resolve(event)
      };
    })
  }

  destroy() {
    this.dataBase.close();
    console.log('数据库连接关闭')
  }
}