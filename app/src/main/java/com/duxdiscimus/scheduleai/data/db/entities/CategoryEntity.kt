package com.duxdiscimus.scheduleai.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.duxdiscimus.scheduleai.domain.model.Category

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val color: Int,
    val icon: String = "event",
    val isDefault: Boolean = false
) {
    fun toDomain() = Category(
        id = id,
        name = name,
        color = color,
        icon = icon,
        isDefault = isDefault
    )

    companion object {
        fun fromDomain(category: Category) = CategoryEntity(
            id = category.id,
            name = category.name,
            color = category.color,
            icon = category.icon,
            isDefault = category.isDefault
        )
    }
}
