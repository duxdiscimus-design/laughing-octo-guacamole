package com.duxdiscimus.scheduleai.data.repository

import com.duxdiscimus.scheduleai.data.db.dao.CategoryDao
import com.duxdiscimus.scheduleai.data.db.entities.CategoryEntity
import com.duxdiscimus.scheduleai.domain.model.Category
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CategoryRepository @Inject constructor(
    private val categoryDao: CategoryDao
) {

    fun getAllCategories(): Flow<List<Category>> =
        categoryDao.getAllCategories().map { list -> list.map { it.toDomain() } }

    suspend fun getCategoryById(id: Long): Category? =
        categoryDao.getCategoryById(id)?.toDomain()

    suspend fun saveCategory(category: Category): Long =
        categoryDao.insertCategory(CategoryEntity.fromDomain(category))

    suspend fun updateCategory(category: Category) =
        categoryDao.updateCategory(CategoryEntity.fromDomain(category))

    suspend fun deleteCategory(category: Category) =
        categoryDao.deleteCategory(CategoryEntity.fromDomain(category))

    suspend fun initializeDefaults() {
        if (categoryDao.getCategoryCount() == 0) {
            categoryDao.insertCategories(
                Category.defaults.map { CategoryEntity.fromDomain(it) }
            )
        }
    }
}
