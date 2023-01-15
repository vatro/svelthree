/** [ _mode `always` only_ ] Executes any queued events and resets the queue afterwards. */
export const invoke_queued_events = (events_queue: (() => void)[]) => {
	if (events_queue.length) {
		for (let i = 0; i < events_queue.length; i++) {
			events_queue[i]()
		}
		events_queue.length = 0
	}
}

/** [ _mode `always` only_ ] Executes the last queued event and resets the queue afterwards. */
export const invoke_last_queued_event = (events_queue: (() => void)[]) => {
	if (events_queue.length) {
		events_queue[0]()
		events_queue.length = 0
	}
}
