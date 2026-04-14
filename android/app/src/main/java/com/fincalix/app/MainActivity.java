package com.fincalix.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebSettings;

import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enable edge-to-edge BEFORE super.onCreate() — the modern API
        // that replaces deprecated setStatusBarColor/getStatusBarColor.
        // This handles transparent status/nav bars on all API levels.
        EdgeToEdge.enable(this);

        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // ── EDGE-TO-EDGE (API 35+ enforcement) ─────────────────────────
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Initial state: dark mode (app's default).
        // White icons for dark background.
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        insetsController.setAppearanceLightStatusBars(false);

        // ── WINDOW BACKGROUND ───────────────────────────────────────────
        // This color fills the status bar area (the gap between the
        // status bar and the WebView). It MUST match the current theme.
        // Dark mode default at launch. JS bridge updates it on toggle.
        int darkNavy = android.graphics.Color.parseColor("#0F172A");
        window.setBackgroundDrawable(
            new android.graphics.drawable.ColorDrawable(darkNavy)
        );
        window.getDecorView().setBackgroundColor(darkNavy);

        // Prevent Android from adding a dark scrim over the status bar
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // ── INSETS PADDING ──────────────────────────────────────────────
        // Push the WebView below the status bar. The gap above is filled
        // by the window background (set above), which the JS bridge
        // dynamically updates to match dark/light theme.
        View rootView = window.getDecorView().findViewById(android.R.id.content);
        if (rootView != null) {
            rootView.setBackgroundColor(darkNavy);
        }
        ViewCompat.setOnApplyWindowInsetsListener(
            findViewById(android.R.id.content),
            (view, windowInsets) -> {
                Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                view.setPadding(
                    insets.left,
                    insets.top,
                    insets.right,
                    insets.bottom
                );
                return WindowInsetsCompat.CONSUMED;
            }
        );

        // Disable long-press on non-WebView areas.
        window.getDecorView().setOnLongClickListener(v -> true);
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Suppress text selection handles & zoom
            webView.setLongClickable(false);
            webView.setOnLongClickListener(v -> true);
            WebSettings settings = webView.getSettings();
            settings.setTextZoom(100);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            // ── JS BRIDGE ───────────────────────────────────────────────
            // Expose native methods so JS can control status bar icon
            // color AND window background color on theme toggle.
            // The Capacitor StatusBar plugin uses deprecated APIs that
            // are IGNORED on API 35+. This bridge uses the MODERN
            // WindowInsetsControllerCompat API.
            webView.addJavascriptInterface(
                new StatusBarBridge(this), "FinCalixBridge"
            );
        }
    }

    // ── NATIVE JS BRIDGE ────────────────────────────────────────────────
    // Called from App.tsx on every theme toggle:
    //   window.FinCalixBridge.setStatusBarStyle(isDarkMode)
    //
    // This single call handles BOTH:
    //   1. Status bar icon color (white in dark mode, dark in light mode)
    //   2. Window background color (matches the theme so the status bar
    //      area background is correct in both modes)
    public static class StatusBarBridge {
        private final Activity activity;

        StatusBarBridge(Activity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void setStatusBarStyle(final boolean isDarkMode) {
            activity.runOnUiThread(() -> {
                Window window = activity.getWindow();

                // ── 1. STATUS BAR ICON COLOR ────────────────────────────
                // isAppearanceLightStatusBars:
                //   true  = dark/black icons  → for LIGHT backgrounds
                //   false = light/white icons  → for DARK backgrounds
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(!isDarkMode);

                // ── 2. WINDOW BACKGROUND COLOR ──────────────────────────
                // The native padding pushes the WebView below the status
                // bar. The gap is filled by the window background.
                // This MUST match the current theme or the status bar
                // area will have the wrong color.
                //   Dark mode:  #0F172A (dark navy)
                //   Light mode: #F8FAFC (off-white)
                String bgColor = isDarkMode ? "#0F172A" : "#F8FAFC";
                int colorInt = android.graphics.Color.parseColor(bgColor);
                window.setBackgroundDrawable(
                    new android.graphics.drawable.ColorDrawable(colorInt)
                );
                window.getDecorView().setBackgroundColor(colorInt);
                View rootView = window.getDecorView().findViewById(android.R.id.content);
                if (rootView != null) {
                    rootView.setBackgroundColor(colorInt);
                }
            });
        }
    }

    // ── CURSOR / "SELECT ALL" FIX ───────────────────────────────────────
    @Override
    public void onActionModeStarted(ActionMode mode) {
        mode.finish();
    }

    @Override
    public void onActionModeFinished(ActionMode mode) {
        super.onActionModeFinished(mode);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearFocus();
            }
        }
    }
}