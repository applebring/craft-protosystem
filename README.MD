# http://
# 运行
npm run start

# Shopify Metaobject

本项目Shopify 元对象（Metaobject）

## 1. 元对象结构 (Definition)
- **名称 (Name)**: Multi Badge,用于管理和渲染全站的菜单徽章/标签（如：Hot, New 等）。
- **句柄 (Handle)**: `multi_badge`

### 字段明细 (Fields)
| 字段名称 | 键 (Handle) | 类型 (Type) | 描述 |
| :Specification | :--- | :--- | :--- | :[{col:"",value:""},{col:"",value:""}] |
| :Download | :--- | :--- | :--- | :多个附件上传 |
---

## 2. 代码调用 (Liquid Usage)

```liquid
{% comment %} 假设对应配置了元数据metafield {% endcomment %}
{%- render 'processMenuIcon', current_collection: current_collection -%}
```snippets
