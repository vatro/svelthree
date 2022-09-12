export default class LogCSS {
	public static PREFIX_ON_MOUNT = "☰"
	public static PREFIX_BEFORE_UPDATE = "~"
	public static PREFIX_AFTER_UPDATE = "✓"

	public static REACTIVE_STATEMENT = "color:red; font-weight:bold;"
	public static BEFORE_UPDATE =
		"font-weight:bold; color: #A5F3FC; background: #4B5563; padding: 2px 4px; border: 1px solid #4B5563; border-radius: 6px;"
	public static AFTER_UPDATE =
		"font-weight:bold; background: #4B5563; color: #BBF7D0; padding: 2px 4px; border: 1px solid #4B5563; border-radius: 6px;"
	public static ON_MOUNT =
		"font-weight:bold; background: #4B5563; color: white; padding: 2px 4px; border: 1px solid #4B5563; border-radius: 6px;"

	public static DEV_DEBUG = "font-weight:normal"
	public static FEATURE_MAU = "font-weight:normal"
}
