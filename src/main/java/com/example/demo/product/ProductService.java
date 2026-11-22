package com.example.demo.product;

import com.example.demo.cache.RedisJsonCache;
import com.example.demo.common.ResourceNotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductService {

    public static final String CACHE_PATTERN = "demo:product*";
    private static final String LIST_KEY = "demo:products:all";

    private static final TypeReference<List<ProductResponse>> LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<ProductResponse> ITEM_TYPE = new TypeReference<>() {
    };

    private final ProductRepository repository;
    private final RedisJsonCache cache;

    public ProductService(ProductRepository repository, RedisJsonCache cache) {
        this.repository = repository;
        this.cache = cache;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> findAll() {
        return cache.getOrLoad(LIST_KEY, LIST_TYPE, () -> repository.findAll(Sort.by("id")).stream()
                .map(ProductResponse::from)
                .toList());
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        return cache.getOrLoad(itemKey(id), ITEM_TYPE, () -> ProductResponse.from(requireProduct(id)));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String name) {
        return repository.findByNameContainingIgnoreCaseOrderByIdAsc(name).stream()
                .map(ProductResponse::from)
                .toList();
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product product = new Product();
        apply(product, request);
        Product saved = repository.save(product);
        cache.evict(LIST_KEY);
        return ProductResponse.from(saved);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = requireProduct(id);
        apply(product, request);
        Product saved = repository.save(product);
        cache.evict(itemKey(id), LIST_KEY);
        return ProductResponse.from(saved);
    }

    @Transactional
    public void delete(Long id) {
        Product product = requireProduct(id);
        repository.delete(product);
        cache.evict(itemKey(id), LIST_KEY);
    }

    private Product requireProduct(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private static void apply(Product product, ProductRequest request) {
        product.setName(request.name().trim());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock());
    }

    private static String itemKey(Long id) {
        return "demo:product:" + id;
    }
}
