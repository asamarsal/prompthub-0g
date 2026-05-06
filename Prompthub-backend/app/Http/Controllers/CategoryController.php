<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\AdminAuthController;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\Category::all());
    }

    public function store(Request $request)
    {
        AdminAuthController::validateAdminRequest($request);

        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:categories',
            'description' => 'nullable|string',
            'type' => 'required|string|in:CURATED,COMMUNITY',
        ]);

        $category = \App\Models\Category::create($request->only('name', 'slug', 'description', 'type'));

        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        AdminAuthController::validateAdminRequest($request);

        $category = \App\Models\Category::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:categories,slug,' . $id,
            'description' => 'nullable|string',
            'type' => 'sometimes|required|string|in:CURATED,COMMUNITY',
        ]);

        $category->update($request->only('name', 'slug', 'description', 'type'));

        return response()->json($category);
    }

    public function destroy(Request $request, $id)
    {
        AdminAuthController::validateAdminRequest($request);

        $category = \App\Models\Category::withCount('aiModels')->findOrFail($id);
        if ($category->ai_models_count > 0) {
            return response()->json(['message' => 'Cannot delete a category that still has AI models.'], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }
}
