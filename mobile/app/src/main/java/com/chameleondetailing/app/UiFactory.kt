package com.chameleondetailing.app

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import kotlin.math.roundToInt

object UiFactory {
    private fun Context.dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

    private fun card(context: Context, alpha: Int = 232): GradientDrawable = GradientDrawable(
        GradientDrawable.Orientation.TL_BR,
        intArrayOf(
            Color.argb(alpha, 13, 18, 14),
            Color.argb(alpha, 5, 9, 6)
        )
    ).apply {
        cornerRadius = context.dp(24).toFloat()
        setStroke(context.dp(1), Color.argb(45, 221, 184, 111))
    }

    private fun primary(context: Context): GradientDrawable = GradientDrawable(
        GradientDrawable.Orientation.LEFT_RIGHT,
        intArrayOf(Color.rgb(245, 209, 132), Color.rgb(204, 156, 77))
    ).apply {
        cornerRadius = context.dp(16).toFloat()
    }

    private fun secondary(context: Context): GradientDrawable = GradientDrawable().apply {
        setColor(Color.argb(210, 16, 21, 17))
        cornerRadius = context.dp(16).toFloat()
        setStroke(context.dp(1), Color.argb(70, 221, 184, 111))
    }

    fun splash(context: Context): View {
        val root = FrameLayout(context).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.chameleon_black))
        }
        val stack = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(context.dp(32), context.dp(32), context.dp(32), context.dp(32))
        }
        val logo = ImageView(context).apply {
            setImageResource(R.drawable.chameleon_logo)
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }
        stack.addView(logo, LinearLayout.LayoutParams(context.dp(130), context.dp(130)).apply {
            gravity = Gravity.CENTER_HORIZONTAL
        })
        stack.addView(TextView(context).apply {
            text = context.getString(R.string.app_name)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(18)
        })
        stack.addView(TextView(context).apply {
            text = context.getString(R.string.splash_caption)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_gold))
            textSize = 14f
            letterSpacing = .12f
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(8)
        })
        stack.addView(ProgressBar(context).apply {
            isIndeterminate = true
        }, LinearLayout.LayoutParams(context.dp(36), context.dp(36)).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            topMargin = context.dp(28)
        })
        root.addView(stack, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        return root
    }

    fun login(context: Context, onGoogle: () -> Unit): View {
        val root = FrameLayout(context).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.chameleon_black))
            setPadding(context.dp(20), context.dp(20), context.dp(20), context.dp(20))
        }
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = card(context)
            setPadding(context.dp(24), context.dp(28), context.dp(24), context.dp(26))
        }
        card.addView(ImageView(context).apply {
            setImageResource(R.drawable.chameleon_logo)
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }, LinearLayout.LayoutParams(context.dp(92), context.dp(92)))
        card.addView(TextView(context).apply {
            text = context.getString(R.string.login_title)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
            textSize = 27f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(14)
        })
        card.addView(TextView(context).apply {
            text = context.getString(R.string.login_text)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_muted))
            textSize = 15f
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(10)
        })
        card.addView(Button(context).apply {
            text = context.getString(R.string.google_sign_in)
            textSize = 16f
            isAllCaps = false
            setTextColor(Color.rgb(12, 14, 12))
            typeface = Typeface.DEFAULT_BOLD
            background = primary(context)
            setOnClickListener { onGoogle() }
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, context.dp(56)).apply {
            topMargin = context.dp(24)
        })
        root.addView(card, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        return root
    }

    fun offline(context: Context, onRetry: () -> Unit): View {
        val root = FrameLayout(context).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.chameleon_black))
            setPadding(context.dp(20), context.dp(20), context.dp(20), context.dp(20))
        }
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = card(context)
            setPadding(context.dp(24), context.dp(28), context.dp(24), context.dp(26))
        }
        card.addView(ImageView(context).apply {
            setImageResource(R.drawable.chameleon_logo)
            alpha = .92f
            adjustViewBounds = true
        }, LinearLayout.LayoutParams(context.dp(80), context.dp(80)))
        card.addView(TextView(context).apply {
            text = context.getString(R.string.offline_title)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
            textSize = 23f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(16)
        })
        card.addView(TextView(context).apply {
            text = context.getString(R.string.offline_text)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_muted))
            textSize = 15f
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(12)
        })
        card.addView(Button(context).apply {
            text = context.getString(R.string.retry_connection)
            isAllCaps = false
            textSize = 15f
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
            background = secondary(context)
            setOnClickListener { onRetry() }
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, context.dp(54)).apply {
            topMargin = context.dp(20)
        })
        card.addView(TextView(context).apply {
            text = context.getString(R.string.waiting_network)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_muted))
            textSize = 12f
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(12)
        })
        root.addView(card, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        return root
    }

    fun restoredBanner(context: Context): TextView = TextView(context).apply {
        text = context.getString(R.string.connection_restored)
        setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
        textSize = 13f
        gravity = Gravity.CENTER
        background = secondary(context)
        setPadding(context.dp(14), context.dp(10), context.dp(14), context.dp(10))
        alpha = 0f
    }

    fun showExitDialog(context: Context, onExit: () -> Unit) {
        val dialog = Dialog(context)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = card(context, 248)
            setPadding(context.dp(22), context.dp(22), context.dp(22), context.dp(18))
        }
        card.addView(TextView(context).apply {
            text = context.getString(R.string.exit_title)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
        })
        card.addView(TextView(context).apply {
            text = context.getString(R.string.exit_text)
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_muted))
            textSize = 15f
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(8)
        })

        val actions = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
        }
        actions.addView(Button(context).apply {
            text = context.getString(R.string.stay)
            isAllCaps = false
            setTextColor(ContextCompat.getColor(context, R.color.chameleon_text))
            background = secondary(context)
            setOnClickListener { dialog.dismiss() }
        }, LinearLayout.LayoutParams(0, context.dp(50), 1f).apply { marginEnd = context.dp(8) })
        actions.addView(Button(context).apply {
            text = context.getString(R.string.exit)
            isAllCaps = false
            setTextColor(Color.rgb(10, 12, 10))
            typeface = Typeface.DEFAULT_BOLD
            background = primary(context)
            setOnClickListener { dialog.dismiss(); onExit() }
        }, LinearLayout.LayoutParams(0, context.dp(50), 1f))
        card.addView(actions, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = context.dp(20)
        })

        dialog.setContentView(card)
        dialog.window?.apply {
            setBackgroundDrawableResource(android.R.color.transparent)
            setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
            attributes = attributes.apply { width = WindowManager.LayoutParams.MATCH_PARENT }
        }
        dialog.show()
        dialog.window?.setLayout((context.resources.displayMetrics.widthPixels * .92f).roundToInt(), WindowManager.LayoutParams.WRAP_CONTENT)
    }
}
