export default class LogCSS {
	public static PREFIX_ON_MOUNT: string = "☰"
	public static PREFIX_BEFORE_UPDATE: string = "~"
	public static PREFIX_AFTER_UPDATE: string = "✓"

	public static REACTIVE_STATEMENT: string = "color:red; font-weight:bold;"
	public static BEFORE_UPDATE: string =
		"font-weight:bold; color: #A5F3FC; background: #4B5563; padding: 2px 4px; border: 1px solid #4B5563; border-radius: 6px;"
	public static AFTER_UPDATE: string =
		"font-weight:bold; background: #4B5563; color: #BBF7D0; padding: 2px 4px; border: 1px solid #4B5563; border-radius: 6px;"
	public static ON_MOUNT: string =
		"font-weight:bold; background: #4B5563; color: white; padding: 2px 4px; border: 1px solid #4B5563; border-radius: 6px;"

	public static DEV_DEBUG: string = "font-weight:normal"
	public static FEATURE_MAU: string = "font-weight:normal"
}
