import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { CatalogPage } from "@/pages/CatalogPage";
import { Home } from "@/pages/Home";
import { NotFound } from "@/pages/NotFound";
import { ProductPage } from "@/pages/ProductPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categoria/:slug" element={<CatalogPage />} />
        <Route path="buscar" element={<CatalogPage />} />
        <Route path="productos/:slug" element={<ProductPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
