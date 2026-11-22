package com.example.demo.product;

import com.example.demo.cache.RedisJsonCache;
import com.example.demo.common.ResourceNotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository repository;

    @Mock
    private RedisJsonCache cache;

    private ProductService service;

    @BeforeEach
    void setUp() {
        service = new ProductService(repository, cache);
    }

    @Test
    void findAllMapsEntitiesToResponses() {
        when(cache.getOrLoad(anyString(), any(TypeReference.class), any())).thenAnswer(invocation -> {
            Supplier<?> loader = invocation.getArgument(2);
            return loader.get();
        });
        when(repository.findAll(any(Sort.class))).thenReturn(List.of(product(1L, "Mouse", "24.99")));

        List<ProductResponse> result = service.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).name()).isEqualTo("Mouse");
        assertThat(result.get(0).price()).isEqualByComparingTo("24.99");
    }

    @Test
    void findByIdThrowsWhenProductDoesNotExist() {
        when(cache.getOrLoad(eq("demo:product:99"), any(TypeReference.class), any())).thenAnswer(invocation -> {
            Supplier<?> loader = invocation.getArgument(2);
            return loader.get();
        });
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void createSavesProductAndEvictsListCache() {
        Product saved = product(7L, "Keyboard", "89.50");
        when(repository.save(any(Product.class))).thenReturn(saved);

        ProductResponse created = service.create(
                new ProductRequest("Keyboard", "Tenkeyless", new BigDecimal("89.50"), 10));

        assertThat(created.id()).isEqualTo(7L);
        assertThat(created.name()).isEqualTo("Keyboard");
        verify(cache).evict("demo:products:all");
    }

    private static Product product(Long id, String name, String price) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setDescription("demo");
        product.setPrice(new BigDecimal(price));
        product.setStock(5);
        return product;
    }
}
