/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
"use client";

const	MAX_WORKERS = 4;

export type	JobType<T> = {
type: string;
data: T;
callback: (result: string) => void;
};

class WorkerManager<T> {
	private	jobQueue: JobType<T>[]; // le tableau dans lequel on stock les jobs doit etre un objet sous cette forme {job{}, workertype: string}
	private	totalWorkers: number; //le nombre total de workers a l'instant T
	private	availableWorker: Promise<Worker>[];

	constructor() {
		this.jobQueue = [];
		this.totalWorkers = 0;
		this.availableWorker = [];
	}

	//fait exactement ce que son nom indique
	addJob( job: JobType<T> ) {
		this.jobQueue.push( job );
		this.assignJob();
	};

	//initialise les workers
	async	initWorker() {
		//en fonction du nombre de tache dans jobsQueue on initialise les workers dans la limite des MAX_WORKERS
		// console.log("Initializing workers...", this.jobQueue.length);
		while ( this.jobQueue.length > 0 ) {
			if ( this.totalWorkers < MAX_WORKERS ) {
				const	worker = new Worker( new URL( "/public/workers/altitude.ts", import.meta.url ) );
				this.totalWorkers++;

				this.availableWorker.push(Promise.resolve( worker ));

				//en cas d'erreur faut il remettre le worker dans la liste des disponibles?
				worker.onerror = ( event: ErrorEvent ) => this.onWorkerError( event );
			} else {
				// console.log("Maximum number of workers reached. Waiting for a worker to become available...");
				// Attendre qu'un worker se libère
				await new Promise(( resolve ) => {
					const	checkAvailability = () => {
						if ( this.availableWorker.length > 0 ) {
							resolve( null );
						} else {
							setTimeout( checkAvailability, 1000 ); // Vérifier à nouveau après un délai
						};
					};
					checkAvailability();
				});
			};
		};
	};

	private	async	assignJob() {
		if ( this.availableWorker.length === 0 || this.availableWorker.length < MAX_WORKERS ) this.initWorker();

		while ( this.jobQueue.length > 0 && this.availableWorker.length > 0 ) {
			const	job = this.jobQueue.shift();
			if ( job ) {
				const	{ type, data, callback } = job;
				const	workerPromise = this.availableWorker.shift();
				const	worker = await workerPromise;

				if ( worker ) {
					worker.onmessage = ( event ) => {
					callback( event.data );
					};
				};
				worker?.postMessage({ type, data });
			};
		};
	};

	public	killAllWorkers() {
		Promise.all( this.availableWorker.map(( workerPromise ) => workerPromise.then(( w ) => w.terminate()))).then(() => {
			this.availableWorker = [];
			this.totalWorkers = 0;
		});
	};

	private	onWorkerError(event: ErrorEvent) {
		console.error("Worker error", event.message);
		return;
	};
}

const	workerManager = new WorkerManager();

export default	workerManager;
