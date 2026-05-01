<?php

namespace App\Http\Controllers;

use App\Models\AiModel;
use Illuminate\Http\Request;

class AiModelController extends Controller
{
    public function index()
    {
        return response()->json(AiModel::with('category')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:ai_models',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
        ]);

        $aiModel = AiModel::create($validated);

        return response()->json($aiModel, 201);
    }

    public function update(Request $request, $id)
    {
        $aiModel = AiModel::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:ai_models,slug,' . $id,
            'description' => 'nullable|string',
            'category_id' => 'sometimes|required|exists:categories,id',
        ]);

        $aiModel->update($validated);

        return response()->json($aiModel);
    }
}
