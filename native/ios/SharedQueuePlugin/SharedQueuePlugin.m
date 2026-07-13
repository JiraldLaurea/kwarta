#import <Capacitor/Capacitor.h>

// Objective-C bridge that exposes SharedQueuePlugin.drain() to the Capacitor
// runtime. Required alongside the Swift class.
CAP_PLUGIN(SharedQueuePlugin, "SharedQueue",
    CAP_PLUGIN_METHOD(drain, CAPPluginReturnPromise);
)
