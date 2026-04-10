package com.truckast

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class DeepLinkModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeepLinkModule"

    @ReactMethod
    fun getDeepLinkUrl(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            val url = activity?.intent?.data?.toString()
            promise.resolve(url)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun clearDeepLinkUrl(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            activity?.intent?.data = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
