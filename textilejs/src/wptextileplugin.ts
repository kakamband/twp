import { PrivateKey, Client, Identity, 
	Buckets, KeyInfo, PushPathResult, UserAuth, PublicKey, Users,
	createUserAuth, APISig, createAPISig   } from '@textile/hub';
import { TEXTILE_AJAX_OBJ_INTERNAL } from './textile-data';
declare const window: any;
declare const document: any;

export class WPTextilePlugin {
	private _apikey: string;
	private _apisecret: string;
	private _privateidentity: string;
	private _main_bucketname: string;
	private _main_bucketkey: string;
	private _keyinfo: any;

	// GETTERS
	public get apikey() {
		return this._apikey;
	}

	public get apisecret() {
		return this._apisecret;
	}

	public get privateidentity() {
		return this._privateidentity;
	}

	public get main_bucketname() {
		return this._main_bucketname;
	}

	public get main_bucketkey() {
		return this._main_bucketkey;
	}

	public get keyinfo() {
		return this._keyinfo;
	}

	/*
	* Set initial data from external object
	* This data includes Textile credentials
	*/
	constructor() {
		// Feed the plugin with Wordpress data
		const data = TEXTILE_AJAX_OBJ_INTERNAL;
		this._apikey = data.hasOwnProperty('apikey') ? data.apikey : '';
		this._apisecret = data.hasOwnProperty('apisecret') ? data.apisecret : '';
		this._privateidentity = data.hasOwnProperty('privateidentity') ? data.privateidentity : '';
		this._main_bucketname = data.hasOwnProperty('bucketname') ? data.bucketname : '';
		this._main_bucketkey = data.hasOwnProperty('bucketkey') ? data.bucketkey : '';
		this._keyinfo = { key: this._apikey, secret: this._apisecret };
	}

	/*
	* Generate new random identity (key pair) for user
	*/
	async generateNewIdentity(): Promise<PrivateKey> {
	  const identity = await PrivateKey.fromRandom();
	  return identity;
	}

	setIdentity(cachedIdentity: string | PrivateKey) {
	  /** Restore any cached user identity first */
	  const cached = cachedIdentity;
	  if (cached !== null && cached !== '') {
	  	if (cached instanceof PrivateKey) {
	  		this._privateidentity = cached.toString();
	  	} else if (typeof(cached) === 'string') {
	  		this._privateidentity = cached;
	  	} else {
	  		throw 'Invalid identity';
	  	}
	  }
	}

	getIdentity(): PrivateKey {
		const identity = PrivateKey.fromString(this._privateidentity)
		return identity
	}

	async setNewIdentityFormFields(inputId: string) {
		const identity = await this.generateNewIdentity();
		const identity_s = identity.toString();

		if (document.getElementById(inputId)) {
			document.getElementById(inputId).value = identity_s;
			// Set internal property privateidentity as well
			this.setIdentity(identity);
		} else {
			throw 'Error creating new identity: Input field: ' + inputId;
		}
	}

	async getBucketsContent(keyinfo: KeyInfo, identity: Identity, main_bucketname: string) {
		let error = '';
		let result = {};
		try {
			var bucketData = null;
			var buckets = null;
			var bucketKey = null;
			var files_links = null;
			
			bucketData = await this.setupBucketEnvironment(keyinfo, identity, main_bucketname);
			buckets = bucketData.hasOwnProperty('buckets') ? bucketData.buckets : null;
			bucketKey = bucketData.hasOwnProperty('bucketKey') ? bucketData.bucketKey : null;
			
			if (buckets && bucketKey) {
				
				files_links = await this.getLinks(buckets, bucketKey);
				const files_msg = 'Files in bucket:' +
					JSON.stringify(files_links);
				result['data'] = files_msg;
			}
		} catch (err) {
			result['error'] = 'WPTextilePlugin Error:' + JSON.stringify(err);
		}
		return result;
	}
	

	/**
	 * loginWithChallenge uses websocket to initiate and respond to
	 * a challenge for the user based on their keypair.
	 * 
	 * Read more about setting up user verification here:
	 * https://docs.textile.io/tutorials/hub/web-app/
	 */
	async loginWithChallenge(id: Identity, key: KeyInfo) {
       	
	    /** Get public key string */
	    const publicKey = id.public.toString();
		console.log('publicKey aa: ', publicKey);

		/**
	   * Init new Hub API Client with the user group API keys
	   */
	  const client = await Client.withKeyInfo(key)
	  let token = null;

	  /** 
	   * Request a token from the Hub based on the user public key */
	   try {

   		token = await client.getTokenChallenge(
		    publicKey,
		    /** The callback passes the challenge back to the client */
		    (challenge: Buffer) => {
		    return new Promise((resolve, reject) => {
		      // Send the challenge back to the client and 
		      // resolve(Buffer.from(sig))
		      // resolve()
		      alert('aa')
		      console.log('challenge', challenge);
		      //return challenge
		    })
		  })
   		console.log('tok')

	  console.log('tokens ', token);

	   } catch (err) {
	   		console.log('error ', err);
	   }
	  

	}


	async authorize_withUser(key: KeyInfo, identity: Identity, user: UserAuth) {
	  const client = await Client.withUserAuth(user)
	  await client.getToken(identity)
	  return client
	}

	async authorize_insecure(key: KeyInfo, identity: Identity) {
	  const client = await Client.withKeyInfo(key)
	  await client.getToken(identity)
	  return client
	}

	

	async getPublicKey(privateKey: string): Promise<PublicKey> {
	  /** Restore any cached user identity first */
	  const cached = privateKey;
	  if (cached !== null && cached !== '') {
	    /** Convert the cached identity string to a PrivateKey and return */
	    return PublicKey.fromString(cached)
	  }

	  return null;
	}

	async sign(identity: PrivateKey, msg: string) {
	   const challenge = Buffer.from(msg);
	   const credentials = identity.sign(challenge);
	   return credentials
	}

	async setupBucketEnvironment(
		key: KeyInfo, identity: Identity, bucketName: string
	) {
	  // Use the insecure key to set up the buckets client
	  // const buckets = await Buckets.withKeyInfo(key)
	  // await buckets.getToken(identity)

	  const user = await this.magicUserAuthWithBucketsToken(key, identity);
	  const buckets = await Buckets.withUserAuth(user);
	
	  // Authorize the user and your insecure keys with getToken
	  const result = await buckets.getOrCreate(bucketName)
	  if (!result.root) {
	    throw new Error('Failed to open bucket')
	  }
	  console.log('setupBucketEnvironment', buckets, result);
	  return {
	      buckets: buckets, 
	      bucketKey: result.root.key,
	  }
	}

	async addIndexJSONFile(buckets: Buckets, bucketKey: string, identity: Identity) {
	  // Create a json model for the index
	  const index = {
	    author: identity.public.toString(),
	    date: (new Date()).getTime(),
	    paths: [],
	  }
	  // Store the index in the Bucket (or in the Thread later)
	  const buf = Buffer.from(JSON.stringify(index, null, 2))
	  const path = `index.json`
	  await buckets.pushPath(bucketKey, path, buf)
	}

	async addIndexHTMLFile(buckets: Buckets, bucketKey: string, html: string) {
	  // Store the index.html in the root of the bucket
	  const buf = Buffer.from(html)
	  const path = `index.html`
	  await buckets.pushPath(bucketKey, path, buf)
	}

	insertFile(
		buckets: Buckets, 
		bucketKey: string, 
		file: File, path: string
	): Promise<PushPathResult> {
	  return new Promise((resolve, reject) => {
	    const reader = new FileReader()
	    reader.onabort = () => reject('file reading was aborted')
	    reader.onerror = () => reject('file reading has failed')
	    reader.onload = () => {
	      const binaryStr = reader.result
	      // Finally, push the full file to the bucket
	      buckets.pushPath(bucketKey, path, binaryStr).then((raw) => {
	        resolve(raw)
	      })
	    }
	    reader.readAsArrayBuffer(file)
	  })
	}

	// This method requires that you run "getOrCreate" or have specified "withThread"
	async getLinks(buckets: Buckets, bucketKey: string) {
	  const links = await buckets.links(bucketKey);
	  return links;
	}

	async getThreads(
		//auth: UserAuth
		key: KeyInfo,
		identity: Identity
	) {
		// Generate a new UserAuth
		const user = await this.magicUserAuthWithUsersToken(key, identity);
		const api = Users.withUserAuth(user)

		console.log('api', api)

		const list = api.listThreads()
		console.log('list', list);
		return list
	}

	async magicUserAuth(key: KeyInfo, identity: Identity) {
		// Create an expiration and create a signature. 60s or less is recommended.
		const expiration = new Date(Date.now() + 60 * 1000);
		
		const userAuth: UserAuth = await createUserAuth(
			key.key, key.secret, expiration
		)
	
		return userAuth;

	}

	async magicUserAuthWithUsersToken(key: KeyInfo, identity: Identity) {
		// Create an expiration and create a signature. 60s or less is recommended.
		const expiration = new Date(Date.now() + 60 * 1000);

		const api = await Users.withKeyInfo(key);
		const token = await api.getToken(identity);
		
		const userAuth: UserAuth = await createUserAuth(
			key.key, key.secret, expiration, token
		)
	
		return userAuth;

	}

	async magicUserAuthWithBucketsToken(key: KeyInfo, identity: Identity) {
		// Create an expiration and create a signature. 60s or less is recommended.
		const expiration = new Date(Date.now() + 60 * 1000);

		const api = await Buckets.withKeyInfo(key);
		const token = await api.getToken(identity);
		
		const userAuth: UserAuth = await createUserAuth(
			key.key, key.secret, expiration, token
		)
	
		return userAuth;

	}


	async uploadFile(
		inputId: string, 
		buckets: Buckets, 
		bucketKey: string
	) {
		const selectedFile = document.getElementById(inputId).files[0];

		if (selectedFile) {
			const file_name = selectedFile.name;

		    if (!selectedFile.type.startsWith('image/')){ 
		    	alert('File must be an image!');
		    	return;
		    }

		    console.log(selectedFile);

		    this.insertFile(buckets, bucketKey, selectedFile, file_name).then((data) => {
		    	console.log(data);
		    	alert('File uploaded succesfully!');
		    }).catch((reason) => {
		    	alert('Error: File not uploaded' + reason.toString());
		    });
		} else {
			alert('Please select an image!');
	    	return;
		}
	}

	uploadFileBtnListener(
		_btnId:string, _imgId:string,
		buckets: Buckets, bucketKey: string
	) {
		// If button exists
		if (document.getElementById(_btnId)) {
			// Add action
			document.getElementById(_btnId).onclick = () => {
				// If image input exists
				if (document.getElementById(_imgId)) {
					this.uploadFile(_imgId, buckets, bucketKey);

				}
			}
		}
	}

}