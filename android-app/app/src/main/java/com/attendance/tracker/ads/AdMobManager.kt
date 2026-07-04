package com.attendance.tracker.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.*
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdMobManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "AdMobManager"
        
        // Production Ad Unit IDs
        const val BANNER_AD_UNIT_ID = "ca-app-pub-9064915704009696/6720621243"
        const val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-9064915704009696/5962713976"
        
        // Test Ad Unit IDs (Use for development/testing)
        // const val BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"
        // const val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
    }
    
    private var interstitialAd: InterstitialAd? = null
    private var isInitialized = false
    
    fun initialize() {
        if (isInitialized) return
        
        MobileAds.initialize(context) { initializationStatus ->
            Log.d(TAG, "AdMob initialized: $initializationStatus")
            isInitialized = true
            loadInterstitialAd()
        }
    }
    
    fun loadInterstitialAd() {
        val adRequest = AdRequest.Builder().build()
        
        InterstitialAd.load(
            context,
            INTERSTITIAL_AD_UNIT_ID,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    Log.d(TAG, "Interstitial ad loaded")
                    interstitialAd = ad
                }
                
                override fun onAdFailedToLoad(error: LoadAdError) {
                    Log.e(TAG, "Interstitial ad failed to load: ${error.message}")
                    interstitialAd = null
                }
            }
        )
    }
    
    fun showInterstitialAd(activity: Activity, onAdDismissed: () -> Unit = {}) {
        if (interstitialAd != null) {
            interstitialAd?.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    Log.d(TAG, "Interstitial ad dismissed")
                    interstitialAd = null
                    loadInterstitialAd() // Load next ad
                    onAdDismissed()
                }
                
                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    Log.e(TAG, "Interstitial ad failed to show: ${error.message}")
                    interstitialAd = null
                    onAdDismissed()
                }
                
                override fun onAdShowedFullScreenContent() {
                    Log.d(TAG, "Interstitial ad showed")
                }
            }
            interstitialAd?.show(activity)
        } else {
            Log.d(TAG, "Interstitial ad not ready")
            onAdDismissed()
        }
    }
    
    fun isInterstitialAdReady(): Boolean = interstitialAd != null
}
