import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AccountPage } from "@/pages/AccountPage";
import { CartPage } from "@/pages/CartPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { Home } from "@/pages/Home";
import { LoginPage } from "@/pages/LoginPage";
import { NotFound } from "@/pages/NotFound";
import { OrderConfirmationPage } from "@/pages/OrderConfirmationPage";
import { ProductPage } from "@/pages/ProductPage";
import { RegisterPage } from "@/pages/RegisterPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categoria/:slug" element={<CatalogPage />} />
        <Route path="buscar" element={<CatalogPage />} />
        <Route path="productos/:slug" element={<ProductPage />} />
        <Route path="carrito" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="pedidos/:id" element={<OrderConfirmationPage />} />
        <Route path="cuenta" element={<AccountPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
