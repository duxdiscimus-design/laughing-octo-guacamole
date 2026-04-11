package com.duxdiscimus.scheduleai.domain.model

data class Category(
    val id: Long = 0,
    val name: String,
    val color: Int,
    val icon: String = "event",
    val isDefault: Boolean = false
) {
    companion object {
        val defaults = listOf(
            Category(1, "Work", 0xFF4A90D9.toInt(), "work", true),
            Category(2, "Personal", 0xFF7BC67E.toInt(), "person", true),
            Category(3, "Health", 0xFFF06292.toInt(), "favorite", true),
            Category(4, "Social", 0xFFFFB74D.toInt(), "groups", true),
            Category(5, "Education", 0xFF9575CD.toInt(), "school", true),
            Category(6, "Travel", 0xFF4DB6AC.toInt(), "flight", true),
            Category(7, "Other", 0xFF90A4AE.toInt(), "more_horiz", true)
        )
    }
}
